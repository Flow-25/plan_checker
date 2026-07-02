import { useState } from "react";
import type { AppDataApi } from "../hooks/useAppData";
import type { ComponentType, Course } from "../types";
import { COMPONENT_LABELS } from "../types";
import { colorByName } from "../utils/colors";
import GroupEditor from "./GroupEditor";

interface Props {
  course: Course;
  api: AppDataApi;
}

export default function CourseCard({ course, api }: Props) {
  const [name, setName] = useState(course.name);
  const [expanded, setExpanded] = useState(true);
  const color = colorByName(course.color);

  const groupsFor = (type: ComponentType) =>
    api.data.groups.filter((g) => g.courseId === course.id && g.type === type);

  const toggleDroppable = (type: ComponentType, on: boolean) => {
    const next = on
      ? [...course.droppableComponents, type]
      : course.droppableComponents.filter((t) => t !== type);
    api.updateCourse(course.id, { droppableComponents: next });
  };

  return (
    <div className={`rounded-2xl border ${course.included ? color.border : "border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-800 shadow-sm transition ${course.included ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-700 p-3">
        <span className={`h-3 w-3 rounded-full ${color.dot}`} />
        <input
          type="text"
          className="flex-1 rounded border border-transparent px-1 py-1 text-base font-semibold hover:border-slate-200 focus:border-slate-300"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => api.updateCourse(course.id, { name })}
        />

        <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={course.included}
            onChange={(e) => api.updateCourse(course.id, { included: e.target.checked })}
          />
          Include
        </label>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete course "${course.name}" and all its groups?`))
              api.deleteCourse(course.id);
          }}
          className="rounded px-2 py-1 text-xs text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          Delete
        </button>
      </div>

      {/* Component type toggles */}
      <div className="flex flex-wrap gap-3 border-b border-slate-100 dark:border-slate-700 px-3 py-2 text-sm">
        {(["lecture", "exercise", "lab"] as ComponentType[]).map((t) => {
          const active = course.componentTypes.includes(t);
          return (
            <label key={t} className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...course.componentTypes, t]
                    : course.componentTypes.filter((x) => x !== t);
                  api.updateCourse(course.id, { componentTypes: next });
                }}
              />
              {COMPONENT_LABELS[t]}
              <span className="text-xs text-slate-400 dark:text-slate-500">({groupsFor(t).length})</span>
            </label>
          );
        })}
      </div>

      {expanded && (
        <div className="space-y-4 p-3">
          {course.componentTypes.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Select at least one component type above.
            </p>
          )}
          {course.componentTypes.map((type) => {
            const groups = groupsFor(type);
            return (
              <div key={type}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {COMPONENT_LABELS[type]} groups
                    </h4>
                    <label
                      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
                      title="If checked, this component may be dropped when no full collision-free plan exists — it just won't be shown."
                    >
                      <input
                        type="checkbox"
                        checked={course.droppableComponents.includes(type)}
                        onChange={(e) => toggleDroppable(type, e.target.checked)}
                      />
                      optional
                    </label>
                  </div>
                  <button
                    onClick={() =>
                      api.addGroup(course.id, type, `Group ${groups.length + 1}`)
                    }
                    className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    + Add group
                  </button>
                </div>
                {groups.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ No groups defined for this required component.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <GroupEditor key={g.id} group={g} api={api} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
