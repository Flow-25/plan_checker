import { useState } from "react";
import type { AppDataApi } from "../hooks/useAppData";
import type { ComponentType } from "../types";
import { COMPONENT_LABELS } from "../types";
import CourseCard from "./CourseCard";
import ExportImportButtons from "./ExportImportButtons";
import UsosImport from "./UsosImport";

interface Props {
  api: AppDataApi;
}

export default function SetupView({ api }: Props) {
  const [name, setName] = useState("");
  const [types, setTypes] = useState<ComponentType[]>(["lecture"]);

  function toggle(t: ComponentType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || types.length === 0) return;
    api.addCourse(name, types);
    setName("");
    setTypes(["lecture"]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Gather your courses
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add every class group you could attend—the planner will choose one of each.
          </p>
        </div>
        <ExportImportButtons api={api} />
      </div>

      <UsosImport api={api} />

      <form
        onSubmit={submit}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm"
      >
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Name of the course
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="e.g. Algorithms and Data Structures"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            What does it include?
          </span>
          <div className="flex gap-2">
            {(["lecture", "exercise", "lab"] as ComponentType[]).map((t) => {
              const on = types.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggle(t)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    on
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {COMPONENT_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="submit"
          disabled={!name.trim() || types.length === 0}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add course
        </button>
      </form>

      {api.data.courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white/50 p-12 text-center text-slate-400 dark:text-slate-500">
          <div className="mb-3 text-3xl">🌱</div>
          <strong className="block text-slate-700 dark:text-slate-200">No courses yet</strong>
          Import your USOS plan above, or add your first course to begin.
        </div>
      ) : (
        <div className="space-y-4">
          {api.data.courses.map((c) => (
            <CourseCard key={c.id} course={c} api={api} />
          ))}
        </div>
      )}
    </div>
  );
}
