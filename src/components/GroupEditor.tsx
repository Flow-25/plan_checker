import { useState } from "react";
import type { AppDataApi } from "../hooks/useAppData";
import type { Group } from "../types";
import SessionRow from "./SessionRow";

interface Props {
  group: Group;
  api: AppDataApi;
}

export default function GroupEditor({ group, api }: Props) {
  const [label, setLabel] = useState(group.label);
  const noSessions = group.sessions.length === 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          className="flex-1 rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm font-medium"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => api.updateGroup(group.id, { label })}
        />
        <button
          onClick={() => api.deleteGroup(group.id)}
          className="rounded px-2 py-1 text-xs text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          Delete group
        </button>
      </div>

      <div className="space-y-2">
        {group.sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            onChange={(patch) => api.updateSession(group.id, s.id, patch)}
            onDelete={() => api.deleteSession(group.id, s.id)}
          />
        ))}
      </div>

      {noSessions && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          ⚠ No sessions — this group will make the course unschedulable.
        </p>
      )}

      <button
        onClick={() =>
          api.addSession(group.id, {
            dayOfWeek: 1,
            startTime: "08:00",
            endTime: "09:30",
            weekParity: "every",
          })
        }
        className="mt-2 rounded border border-dashed border-slate-300 dark:border-slate-600 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        + Add session
      </button>
    </div>
  );
}
