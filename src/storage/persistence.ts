import type { AppData } from "../types";

const STORAGE_KEY = "schedule-planner-data";
const CURRENT_VERSION = 1;

export const emptyData: AppData = {
  version: CURRENT_VERSION,
  courses: [],
  groups: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw);
    return normalize(parsed);
  } catch {
    return emptyData;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be full or disabled; fail silently — export is the backup.
  }
}

/** Validate/coerce an arbitrary parsed object into AppData shape. */
export function normalize(input: unknown): AppData {
  if (!input || typeof input !== "object") return emptyData;
  const obj = input as Partial<AppData>;
  const courses = Array.isArray(obj.courses) ? obj.courses : [];
  const groups = Array.isArray(obj.groups) ? obj.groups : [];
  return {
    version: CURRENT_VERSION,
    courses: courses.map((c) => {
      // Migrate legacy whole-course `droppable` flag to per-component form.
      const legacy = (c as { droppable?: boolean }).droppable;
      const droppableComponents =
        c.droppableComponents ?? (legacy ? (c.componentTypes ?? []) : []);
      return {
        ...c,
        included: c.included ?? true,
        droppableComponents,
      };
    }),
    groups,
  };
}

export function exportToFile(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `schedule-planner-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
