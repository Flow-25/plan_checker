import { useState } from "react";
import type { AppDataApi } from "../hooks/useAppData";
import { parseUsosPlan, type UsosParseResult } from "../usos/parseUsosPlan";

interface Props {
  api: AppDataApi;
}

type Status =
  | { kind: "idle" }
  | { kind: "parsed"; result: UsosParseResult }
  | { kind: "error"; message: string };

export default function UsosImport({ api }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function handleRead() {
    const result = parseUsosPlan(
      input,
      api.data.courses.map((c) => c.color),
    );
    if (result.courses.length === 0) {
      setStatus({
        kind: "error",
        message:
          "No classes found in that HTML. Make sure the plan is in 'semestralny' (whole-semester) view before copying — the current-week view is empty during holidays — and that you copied the whole page.",
      });
      return;
    }
    setStatus({ kind: "parsed", result });
  }

  function confirmAdd() {
    if (status.kind !== "parsed") return;
    api.importData(status.result.courses, status.result.groups);
    setInput("");
    setStatus({ kind: "idle" });
    setOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span className="text-lg">📥</span> Import from USOS
        </span>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 p-5">
          <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 p-4">
            <h4 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
              How to get your plan HTML
            </h4>
            <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
              <li>Create a personal plan in USOSweb for the correct semester.</li>
              <li>Add <strong>all courses and every class group</strong> that you attend or would be willing to attend.</li>
              <li>Open the finished plan in a browser tab.</li>
              <li>
                Above the timetable, switch the view to{" "}
                <strong>„semestralny”</strong> (whole semester) — the default
                week view is empty outside term time.
              </li>
              <li>
                Right-click an empty part of the page and choose <strong>View page source</strong>, or press{" "}
                <kbd className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-1">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-1">
                  U
                </kbd>{" "}
                . In the new source tab, press Ctrl+A and then Ctrl+C to copy all HTML.
                On macOS use the browser menu to open page source, then ⌘A and ⌘C.
              </li>
              <li>
                Paste the HTML into Elenya below and press <strong>Read plan</strong>.
              </li>
            </ol>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              We can’t fetch the link directly — USOS requires your login session
              and blocks cross-site requests — so pasting the page is the
              reliable way. Nothing leaves your browser.
            </p>
          </div>

          <textarea
            className="h-32 w-full rounded-xl border border-slate-300 dark:border-slate-600 p-3 font-mono text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Paste the copied USOS plan page here…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRead}
              disabled={!input.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
            >
              Read plan
            </button>
            {input && (
              <button
                onClick={() => {
                  setInput("");
                  setStatus({ kind: "idle" });
                }}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          {status.kind === "error" && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
              {status.message}
            </div>
          )}

          {status.kind === "parsed" && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Found {status.result.summary.courseCount} course(s),{" "}
                {status.result.summary.groupCount} group(s),{" "}
                {status.result.summary.sessionCount} session(s).
              </p>
              <ul className="mt-2 max-h-44 space-y-0.5 overflow-y-auto text-xs text-slate-700 dark:text-slate-200">
                {status.result.courses.map((c) => {
                  const gc = status.result.groups.filter(
                    (g) => g.courseId === c.id,
                  ).length;
                  return (
                    <li key={c.id}>
                      • {c.name}{" "}
                      <span className="text-slate-400 dark:text-slate-500">
                        ({c.componentTypes.join(", ")} — {gc} groups)
                      </span>
                    </li>
                  );
                })}
              </ul>
              {status.result.summary.warnings.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                  {status.result.summary.warnings.map((w, i) => (
                    <li key={i}>⚠ {w}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={confirmAdd}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Add to my courses
                </button>
                <button
                  onClick={() => setStatus({ kind: "idle" })}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
