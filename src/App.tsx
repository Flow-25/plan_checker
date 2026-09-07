import { useEffect, useState } from "react";
import { useAppData } from "./hooks/useAppData";
import { useTheme } from "./hooks/useTheme";
import type { CriteriaOrder } from "./types";
import { DEFAULT_CRITERIA } from "./types";
import SetupView from "./components/SetupView";
import PlanView from "./components/PlanView";
import HelpGuide from "./components/HelpGuide";

type Tab = "setup" | "plan";

const CRITERIA_KEY = "schedule-planner-criteria";

function loadCriteria(): CriteriaOrder {
  try {
    const raw = localStorage.getItem(CRITERIA_KEY);
    if (!raw) return DEFAULT_CRITERIA;
    const known = new Set(DEFAULT_CRITERIA.map((criterion) => criterion.key));
    const parsed = (JSON.parse(raw) as CriteriaOrder).filter((criterion) => known.has(criterion.key));
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
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CRITERIA_KEY, JSON.stringify(criteria));
  }, [criteria]);

  return (
    <div className="elenya-app min-h-screen text-slate-900 dark:text-slate-100">
      <div className="starfield" aria-hidden="true">
        {Array.from({ length: 68 }, (_, index) => <i key={index} />)}
      </div>
      <header className="elenya-header sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="elenya-mark" aria-hidden="true" title="The star of Eärendil">
              <span>✦</span>
            </div>
            <div>
              <h1 className="elenya-title text-xl font-bold tracking-tight">
                Elenya
              </h1>
              <p className="elenya-subtitle text-xs">
                A timetable beneath the stars of Varda.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="elenya-tabs flex gap-1 rounded-xl p-1" aria-label="Planner steps">
              <TabButton active={tab === "setup"} onClick={() => setTab("setup")} number="1">
                Gather courses
              </TabButton>
              <TabButton active={tab === "plan"} onClick={() => setTab("plan")} number="2">
                Choose a week
              </TabButton>
            </nav>
            <button onClick={() => setHelpOpen(true)} className="help-button" aria-haspopup="dialog">
              <span aria-hidden="true">?</span><span className="help-label">What’s this?</span>
            </button>
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle dark mode"
              className="theme-button flex h-10 w-10 items-center justify-center rounded-full text-lg transition"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="journey-banner mb-7">
          <div>
            <span className="eyebrow">{tab === "setup" ? "Before the journey · Gather your courses" : "By the light of Eärendil · Shape your week"}</span>
            <p>{tab === "setup" ? "Enter every class you may attend. Your choices remain safely on this device." : "Compare each collision-free path, ordered by what matters to you."}</p>
          </div>
          {tab === "setup" && api.data.courses.length > 0 && (
            <button className="primary-cta" onClick={() => setTab("plan")}>Find my timetable <span>→</span></button>
          )}
        </div>
        <div className="arda-line mb-7" aria-label="Silmarillion-inspired decoration">
          <span>Telperion</span><i>✦</i><span>Varda</span><b>◇</b><span>Eärendil</span><i>✦</i><span>Laurelin</span>
        </div>
        {tab === "setup" ? (
          <SetupView api={api} />
        ) : (
          <PlanView api={api} criteria={criteria} setCriteria={setCriteria} />
        )}
      </main>

      <footer className="elenya-footer mx-auto max-w-6xl px-4 pb-10 pt-4 text-center text-xs">
        <span>✧</span> Inspired by the starlit tales of <em>The Silmarillion</em>. Your plans remain in your own browser. <span>✧</span>
      </footer>
      <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} onGoTo={(next) => { setTab(next); setHelpOpen(false); }} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  number,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  number: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <span className="tab-number">{number}</span>{children}
    </button>
  );
}
