import { useEffect, useState } from "react";
import { useAppData } from "./hooks/useAppData";
import { useTheme } from "./hooks/useTheme";
import type { CriteriaOrder } from "./types";
import { DEFAULT_CRITERIA } from "./types";
import SetupView from "./components/SetupView";
import PlanView from "./components/PlanView";

type Tab = "setup" | "plan";

const CRITERIA_KEY = "schedule-planner-criteria";

function loadCriteria(): CriteriaOrder {
  try {
    const raw = localStorage.getItem(CRITERIA_KEY);
    if (!raw) return DEFAULT_CRITERIA;
    const parsed = JSON.parse(raw) as CriteriaOrder;
    // Ensure all known criteria are present (in case new ones were added).
    const keys = new Set(parsed.map((c) => c.key));
    const merged = [...parsed];
    for (const def of DEFAULT_CRITERIA) {
      if (!keys.has(def.key)) merged.push(def);
    }
    return merged;
  } catch {
    return DEFAULT_CRITERIA;
  }
}

export default function App() {
  const api = useAppData();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("setup");
  const [criteria, setCriteria] = useState<CriteriaOrder>(() => loadCriteria());

  useEffect(() => {
    localStorage.setItem(CRITERIA_KEY, JSON.stringify(criteria));
  }, [criteria]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg text-white shadow-sm">
              📅
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Schedule Planner
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collision-free university timetables — 100% in your browser.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
              <TabButton active={tab === "setup"} onClick={() => setTab("setup")}>
                Setup
              </TabButton>
              <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
                Plan &amp; results
              </TabButton>
            </nav>
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle dark mode"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "setup" ? (
          <SetupView api={api} />
        ) : (
          <PlanView api={api} criteria={criteria} setCriteria={setCriteria} />
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        No account, no server. Everything stays local — export a backup to move
        between devices.
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
