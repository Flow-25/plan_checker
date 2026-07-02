import type { Session, WeekParity } from "../types";
import { DAY_SHORT } from "../utils/time";
import { isValidTimeRange } from "../utils/time";

interface Props {
  session: Session;
  onChange: (patch: Partial<Session>) => void;
  onDelete: () => void;
}

const PARITIES: { value: WeekParity; label: string }[] = [
  { value: "every", label: "Every week" },
  { value: "odd", label: "Odd weeks" },
  { value: "even", label: "Even weeks" },
];

export default function SessionRow({ session, onChange, onDelete }: Props) {
  const invalid = !isValidTimeRange(session.startTime, session.endTime);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 dark:bg-slate-800 p-2 text-sm">
      <select
        className="rounded border border-slate-300 dark:border-slate-600 px-1 py-1"
        value={session.dayOfWeek}
        onChange={(e) => onChange({ dayOfWeek: Number(e.target.value) })}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <option key={d} value={d}>
            {DAY_SHORT[d]}
          </option>
        ))}
      </select>

      <input
        type="time"
        className={`rounded border px-1 py-1 ${invalid ? "border-red-400 bg-red-50" : "border-slate-300 dark:border-slate-600"}`}
        value={session.startTime}
        onChange={(e) => onChange({ startTime: e.target.value })}
      />
      <span className="text-slate-400 dark:text-slate-500">–</span>
      <input
        type="time"
        className={`rounded border px-1 py-1 ${invalid ? "border-red-400 bg-red-50" : "border-slate-300 dark:border-slate-600"}`}
        value={session.endTime}
        onChange={(e) => onChange({ endTime: e.target.value })}
      />

      <select
        className="rounded border border-slate-300 dark:border-slate-600 px-1 py-1"
        value={session.weekParity}
        onChange={(e) => onChange({ weekParity: e.target.value as WeekParity })}
      >
        {PARITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Room (optional)"
        className="w-28 rounded border border-slate-300 dark:border-slate-600 px-2 py-1"
        value={session.location ?? ""}
        onChange={(e) => onChange({ location: e.target.value })}
      />

      {invalid && (
        <span className="text-xs text-red-600">End must be after start</span>
      )}

      <button
        onClick={onDelete}
        className="ml-auto rounded px-2 py-1 text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600"
        title="Delete session"
      >
        ✕
      </button>
    </div>
  );
}
