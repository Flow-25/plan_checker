import type { Combination, Course, Group } from "../types";
import { COMPONENT_LABELS } from "../types";
import { colorByName } from "../utils/colors";
import { DAY_SHORT, fromMinutes, toMinutes } from "../utils/time";

interface Props {
  combination: Combination;
  groupsById: Map<string, Group>;
  coursesById: Map<string, Course>;
  /** All groups, used to resolve dropped ("optional") components for display. */
  allGroups: Group[];
}

interface Block {
  day: number;
  start: number;
  end: number;
  course: Course;
  group: Group;
  location?: string;
  parity: string;
  ghost: boolean; // dropped optional component, shown for reference
  // Layout, filled in per day:
  col: number;
  cols: number;
}

const PX_PER_MIN = 0.95;

/**
 * Assign side-by-side columns to overlapping blocks within a single day, so
 * simultaneous classes (and dropped-but-shown optional ones) are all visible.
 */
function layoutDay(blocks: Block[]): void {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  let cluster: Block[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    for (const b of cluster) {
      let placed = false;
      for (let i = 0; i < colEnds.length; i++) {
        if (b.start >= colEnds[i]) {
          b.col = i;
          colEnds[i] = b.end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        b.col = colEnds.length;
        colEnds.push(b.end);
      }
    }
    const cols = colEnds.length;
    for (const b of cluster) b.cols = cols;
    cluster = [];
  };

  for (const b of sorted) {
    if (b.start >= clusterEnd && cluster.length > 0) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  flush();
}

export default function ScheduleCalendarView({
  combination,
  groupsById,
  coursesById,
  allGroups,
}: Props) {
  const blocks: Block[] = [];

  const pushGroup = (group: Group, ghost: boolean) => {
    const course = coursesById.get(group.courseId);
    if (!course) return;
    for (const s of group.sessions) {
      const start = toMinutes(s.startTime);
      const end = toMinutes(s.endTime);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      blocks.push({
        day: s.dayOfWeek,
        start,
        end,
        course,
        group,
        location: s.location,
        parity: s.weekParity,
        ghost,
        col: 0,
        cols: 1,
      });
    }
  };

  for (const gid of combination.groupIds) {
    const group = groupsById.get(gid);
    if (group) pushGroup(group, false);
  }

  // Show dropped ("optional") components too — but only when the slot has a
  // single group, so we don't imply that alternative groups all happen.
  for (const slot of combination.droppedSlots) {
    const groups = allGroups.filter(
      (g) => g.courseId === slot.courseId && g.type === slot.type,
    );
    if (groups.length === 1) pushGroup(groups[0], true);
  }

  if (blocks.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">No sessions to display.</p>;
  }

  const usesWeekend = blocks.some((b) => b.day >= 6);
  const days = usesWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

  let minStart = Math.min(...blocks.map((b) => b.start));
  let maxEnd = Math.max(...blocks.map((b) => b.end));
  minStart = Math.floor(minStart / 60) * 60;
  maxEnd = Math.ceil(maxEnd / 60) * 60;
  const height = (maxEnd - minStart) * PX_PER_MIN;

  const hourLines: number[] = [];
  for (let m = minStart; m <= maxEnd; m += 60) hourLines.push(m);

  // Lay out overlaps per day.
  for (const day of days) layoutDay(blocks.filter((b) => b.day === day));

  const hasGhosts = blocks.some((b) => b.ghost);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[680px] gap-1.5">
        {/* Time axis */}
        <div className="relative w-11 shrink-0" style={{ height: height + 24 }}>
          <div className="h-6" />
          {hourLines.map((m) => (
            <div
              key={m}
              className="absolute right-1 text-[10px] font-medium text-slate-400 dark:text-slate-500"
              style={{ top: 24 + (m - minStart) * PX_PER_MIN - 6 }}
            >
              {fromMinutes(m)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <div key={day} className="flex-1">
            <div className="mb-1 flex h-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {DAY_SHORT[day]}
            </div>
            <div
              className="relative rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              style={{ height }}
            >
              {hourLines.map((m, i) => (
                <div
                  key={m}
                  className={`absolute inset-x-0 border-t ${i === 0 ? "border-transparent" : "border-slate-100 dark:border-slate-700"}`}
                  style={{ top: (m - minStart) * PX_PER_MIN }}
                />
              ))}
              {blocks
                .filter((b) => b.day === day)
                .map((b, i) => {
                  const color = colorByName(b.course.color);
                  const widthPct = 100 / b.cols;
                  return (
                    <div
                      key={i}
                      className={`absolute overflow-hidden rounded-md border px-1 py-0.5 text-[10px] leading-tight shadow-sm ${color.bg} ${color.border} ${color.text} ${
                        b.ghost ? "border-dashed opacity-60" : ""
                      }`}
                      style={{
                        top: (b.start - minStart) * PX_PER_MIN + 1,
                        height: (b.end - b.start) * PX_PER_MIN - 2,
                        left: `calc(${b.col * widthPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                      }}
                      title={`${b.course.name} — ${COMPONENT_LABELS[b.group.type]} (${b.group.label})${b.ghost ? " — optional, not scheduled" : ""}`}
                    >
                      <div className="truncate font-semibold">{b.course.name}</div>
                      <div className="truncate">
                        {COMPONENT_LABELS[b.group.type]} · {b.group.label}
                      </div>
                      <div className="truncate opacity-80">
                        {fromMinutes(b.start)}–{fromMinutes(b.end)}
                      </div>
                      {b.location && (
                        <div className="truncate opacity-80">📍 {b.location}</div>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {b.parity !== "every" && (
                          <span className="rounded bg-white/70 px-1 text-[9px] font-medium">
                            {b.parity}
                          </span>
                        )}
                        {b.ghost && (
                          <span className="rounded bg-white/80 px-1 text-[9px] font-semibold uppercase tracking-wide">
                            optional
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {hasGhosts && (
        <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-block h-3 w-5 rounded border border-dashed border-slate-400 bg-slate-100 dark:bg-slate-700 opacity-70" />
          Dashed “optional” blocks are components that were dropped to avoid a
          clash — shown here for reference; they aren’t part of the scheduled
          plan.
        </p>
      )}
    </div>
  );
}
