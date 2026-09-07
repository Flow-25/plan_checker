import type { CriteriaOrder } from "../types";
import { CRITERION_LABELS } from "../types";

interface Props {
  criteria: CriteriaOrder;
  onChange: (next: CriteriaOrder) => void;
}

export default function CriteriaSelector({ criteria, onChange }: Props) {
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= criteria.length) return;
    const next = [...criteria];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function toggle(index: number) {
    const next = criteria.map((c, i) =>
      i === index ? { ...c, enabled: !c.enabled } : c,
    );
    onChange(next);
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
        What makes a good week?
      </h3>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Tick what matters, then move your strongest preference to the top. Alternating classes are scored across odd and even weeks.
      </p>
      <ol className="space-y-2">
        {criteria.map((c, i) => (
          <li
            key={c.key}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
              c.enabled ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
              {i + 1}
            </span>
            <label className="flex flex-1 items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={() => toggle(i)}
              />
              {CRITERION_LABELS[c.key]}
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded border border-slate-300 dark:border-slate-600 px-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === criteria.length - 1}
                className="rounded border border-slate-300 dark:border-slate-600 px-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
