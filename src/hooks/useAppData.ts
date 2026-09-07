import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, Course, ComponentType, Group, Session } from "../types";
import { loadData, saveData } from "../storage/persistence";
import { uid } from "../utils/id";
import { nextColor } from "../utils/colors";

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave on every change.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveData(data), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data]);

  const replaceAll = useCallback((next: AppData) => setData(next), []);

  /** Append imported courses + their groups to the existing data. */
  const importData = useCallback((courses: Course[], groups: Group[]) => {
    setData((d) => ({
      ...d,
      courses: [...d.courses, ...courses],
      groups: [...d.groups, ...groups],
    }));
  }, []);

  const addCourse = useCallback((name: string, componentTypes: ComponentType[]) => {
    setData((d) => {
      const color = nextColor(d.courses.map((c) => c.color));
      const course: Course = {
        id: uid(),
        name: name.trim() || "Untitled course",
        color,
        componentTypes,
        included: true,
        // Lectures are optional by default: they rarely have alternative groups,
        // so allowing them to be dropped keeps the planner from dead-ending.
        droppableComponents: componentTypes.includes("lecture") ? ["lecture"] : [],
      };
      return { ...d, courses: [...d.courses, course] };
    });
  }, []);

  const updateCourse = useCallback((id: string, patch: Partial<Course>) => {
    setData((d) => ({
      ...d,
      courses: d.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCourse = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      courses: d.courses.filter((c) => c.id !== id),
      groups: d.groups.filter((g) => g.courseId !== id),
    }));
  }, []);

  const addGroup = useCallback(
    (courseId: string, type: ComponentType, label: string) => {
      const group: Group = {
        id: uid(),
        courseId,
        type,
        label: label.trim() || "Group",
        sessions: [],
        excluded: false,
        pinned: false,
      };
      setData((d) => ({ ...d, groups: [...d.groups, group] }));
      return group.id;
    },
    [],
  );

  const updateGroup = useCallback((id: string, patch: Partial<Group>) => {
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, []);

  const toggleGroupPinned = useCallback((id: string) => {
    setData((d) => {
      const target = d.groups.find((g) => g.id === id);
      if (!target) return d;
      const nextPinned = !target.pinned;
      return {
        ...d,
        groups: d.groups.map((g) =>
          g.courseId === target.courseId && g.type === target.type
            ? { ...g, pinned: g.id === id ? nextPinned : false, excluded: g.id === id && nextPinned ? false : g.excluded }
            : g,
        ),
      };
    });
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setData((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== id) }));
  }, []);

  const addSession = useCallback((groupId: string, session: Omit<Session, "id">) => {
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === groupId
          ? { ...g, sessions: [...g.sessions, { ...session, id: uid() }] }
          : g,
      ),
    }));
  }, []);

  const updateSession = useCallback(
    (groupId: string, sessionId: string, patch: Partial<Session>) => {
      setData((d) => ({
        ...d,
        groups: d.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                sessions: g.sessions.map((s) =>
                  s.id === sessionId ? { ...s, ...patch } : s,
                ),
              }
            : g,
        ),
      }));
    },
    [],
  );

  const deleteSession = useCallback((groupId: string, sessionId: string) => {
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === groupId
          ? { ...g, sessions: g.sessions.filter((s) => s.id !== sessionId) }
          : g,
      ),
    }));
  }, []);

  return {
    data,
    replaceAll,
    importData,
    addCourse,
    updateCourse,
    deleteCourse,
    addGroup,
    updateGroup,
    toggleGroupPinned,
    deleteGroup,
    addSession,
    updateSession,
    deleteSession,
  };
}

export type AppDataApi = ReturnType<typeof useAppData>;
