import { useMemo, useState } from "react";
import type { AppDataApi } from "../hooks/useAppData";
import type { CriteriaOrder, DroppedSlot, RankedCombination } from "../types";
import { COMPONENT_LABELS } from "../types";
import { planSchedules } from "../scheduling/plan";
import { formatDuration } from "../utils/time";
import CriteriaSelector from "./CriteriaSelector";
import ScheduleCalendarView from "./ScheduleCalendarView";

interface Props {
  api: AppDataApi;
  criteria: CriteriaOrder;
  setCriteria: (c: CriteriaOrder) => void;
}

const PAGE = 20;

export default function PlanView({ api, criteria, setCriteria }: Props) {
  const [visible, setVisible] = useState(PAGE);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const coursesById = useMemo(
    () => new Map(api.data.courses.map((c) => [c.id, c])),
    [api.data.courses],
  );
  const groupsById = useMemo(
    () => new Map(api.data.groups.map((g) => [g.id, g])),
    [api.data.groups],
  );

  const outcome = useMemo(
    () => planSchedules(api.data.courses, api.data.groups, criteria),
    [api.data.courses, api.data.groups, criteria],
  );

  const includedCount = api.data.courses.filter((c) => c.included).length;
  const selected: RankedCombination | undefined = outcome.ranked[selectedIndex];

  const emptySlotCourses = outcome.emptySlots
    .map((s) => coursesById.get(s.courseId)?.name)
    .filter(Boolean);

  const describeSlot = (s: DroppedSlot) =>
    `${coursesById.get(s.courseId)?.name ?? "?"} — ${COMPONENT_LABELS[s.type]}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Left: criteria + results list */}
      <div className="space-y-4">
        <CriteriaSelector criteria={criteria} onChange={setCriteria} />

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Possible paths</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {outcome.ranked.length} plan(s)
              {outcome.truncated && " (capped)"}
            </span>
          </div>

          {includedCount === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Your map is blank. Return to Gather courses and include at least one course.
            </p>
          )}

          {includedCount > 0 && outcome.noSolution && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold">No collision-free schedule found.</p>
              {emptySlotCourses.length > 0 ? (
                <p className="mt-1">
                  These courses have a required component with no groups defined:{" "}
                  <strong>{emptySlotCourses.join(", ")}</strong>.
                </p>
              ) : (
                <p className="mt-1">
                  Every combination has a time collision. In Setup, mark the
                  clashing component (lecture / exercise / lab) as{" "}
                  <strong>optional</strong> so it can be dropped, or add more group
                  options.
                </p>
              )}
            </div>
          )}

          {outcome.usedFallback && (
            <div className="mb-3 rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 p-3 text-xs text-orange-800 dark:text-orange-300">
              No plan fit everything. Showing best plans with these components
              dropped:{" "}
              <strong>{outcome.droppedSlots.map(describeSlot).join("; ")}</strong>.
            </div>
          )}

          {outcome.truncated && (
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Search hit the safety cap — results may be incomplete but are still
              ranked among those found.
            </p>
          )}

          <ul className="space-y-2">
            {outcome.ranked.slice(0, visible).map((r, i) => {
              const active = i === selectedIndex;
              return (
                <li key={i}>
                  <button
                    onClick={() => setSelectedIndex(i)}
                    className={`w-full rounded-lg border p-2 text-left text-xs transition ${
                      active
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        #{i + 1}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">
                        score {r.score.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Metric label="gaps" value={formatDuration(r.metrics.gapMinutes)} />
                      <Metric label="avg. free days" value={formatCount(r.metrics.freeDays)} />
                      <Metric label="avg. days used" value={formatCount(r.metrics.daysUsed)} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {visible < outcome.ranked.length && (
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className="mt-3 w-full rounded border border-slate-300 dark:border-slate-600 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Load more ({outcome.ranked.length - visible} remaining)
            </button>
          )}
        </div>
      </div>

      {/* Right: calendar for the selected plan */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        {selected ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Your week · option #{selectedIndex + 1}
              </h3>
              <div className="flex flex-wrap gap-1">
                <Metric label="gaps" value={formatDuration(selected.metrics.gapMinutes)} />
                <Metric label="avg. free days" value={formatCount(selected.metrics.freeDays)} />
                <Metric label="avg. days used" value={formatCount(selected.metrics.daysUsed)} />
              </div>
            </div>
            <ScheduleCalendarView
              combination={selected.combination}
              groupsById={groupsById}
              coursesById={coursesById}
              allGroups={api.data.groups}
            />
          </>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No plan selected. Ranked plans will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

function formatCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
      {label}: <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </span>
  );
}
