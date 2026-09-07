import type {
  Course,
  Group,
  Combination,
  ComponentType,
  DroppedSlot,
  Session,
} from "../types";
import { anyCollision, sessionsCollide } from "./collision";
import { toMinutes } from "../utils/time";
import { isValidTimeRange } from "../utils/time";

/**
 * A canonical string for a group's weekly time footprint (day + time + parity
 * of each session), ignoring room/teacher. Two groups with the same footprint
 * are interchangeable on the timetable.
 */
export function sessionFootprint(sessions: Session[]): string {
  return sessions
    .map(
      (s) =>
        `${s.dayOfWeek}|${toMinutes(s.startTime)}|${toMinutes(s.endTime)}|${s.weekParity}`,
    )
    .sort()
    .join("~");
}

export interface GenerateOptions {
  /** Stop after collecting this many valid combinations. */
  maxResults?: number;
  /** Stop after this many milliseconds of searching. */
  timeBudgetMs?: number;
}

export interface GenerateResult {
  combinations: Combination[];
  /** True if a cap (results or time) stopped the search early. */
  truncated: boolean;
  /** Slots that had zero groups defined (course/component with no options). */
  emptySlots: DroppedSlot[];
  droppedSlots: DroppedSlot[];
}

interface Slot {
  courseId: string;
  type: ComponentType;
  /** Candidate groups for this slot, with sessions pre-resolved. */
  options: { group: Group; sessions: Session[] }[];
}

const slotKey = (courseId: string, type: ComponentType) => `${courseId}|${type}`;

function hasInternalCollision(sessions: Session[]): boolean {
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      if (sessionsCollide(sessions[i], sessions[j])) return true;
    }
  }
  return false;
}

/**
 * Build the choice slots for the given courses: one slot per required
 * component type per course. Any (course, component) slot in `droppedSlots`
 * is excluded entirely.
 */
function buildSlots(
  courses: Course[],
  groups: Group[],
  droppedSlots: DroppedSlot[],
): { slots: Slot[]; emptySlots: DroppedSlot[] } {
  const slots: Slot[] = [];
  const emptySlots: DroppedSlot[] = [];
  const dropped = new Set(droppedSlots.map((s) => slotKey(s.courseId, s.type)));

  for (const course of courses) {
    if (!course.included) continue;
    for (const type of course.componentTypes) {
      if (dropped.has(slotKey(course.id, type))) continue;
      const candidates = groups.filter(
        (g) => g.courseId === course.id && g.type === type && !g.excluded,
      );
      const pinned = candidates.filter((g) => g.pinned);
      const allowed = pinned.length > 0 ? pinned : candidates;
      const all = allowed
        .filter(
          (g) =>
            g.sessions.length > 0 &&
            g.sessions.every(
              (s) =>
                Number.isInteger(s.dayOfWeek) &&
                s.dayOfWeek >= 1 &&
                s.dayOfWeek <= 7 &&
                ["every", "odd", "even"].includes(s.weekParity) &&
                isValidTimeRange(s.startTime, s.endTime),
            ) && !hasInternalCollision(g.sessions),
        )
        .map((group) => ({ group, sessions: group.sessions }));
      if (all.length === 0) {
        emptySlots.push({ courseId: course.id, type });
        continue;
      }
      // Collapse groups that occupy the same time footprint to one option, so
      // interchangeable groups don't multiply into identical-looking plans.
      const seen = new Set<string>();
      const options: typeof all = [];
      for (const opt of all) {
        const sig = sessionFootprint(opt.sessions);
        if (seen.has(sig)) continue;
        seen.add(sig);
        options.push(opt);
      }
      slots.push({ courseId: course.id, type, options });
    }
  }
  return { slots, emptySlots };
}

/**
 * Incremental backtracking search over the Cartesian product of slots, pruning
 * any partial assignment that introduces a time collision (§5.2).
 */
export function generateCombinations(
  courses: Course[],
  groups: Group[],
  options: GenerateOptions = {},
  droppedSlots: DroppedSlot[] = [],
): GenerateResult {
  const maxResults = options.maxResults ?? 2000;
  const timeBudgetMs = options.timeBudgetMs ?? 3000;
  const start = performance.now();

  const { slots, emptySlots } = buildSlots(courses, groups, droppedSlots);

  // Order slots with the fewest options first to prune earlier.
  slots.sort((a, b) => a.options.length - b.options.length);

  const combinations: Combination[] = [];
  let truncated = false;

  // If there are empty slots for included, non-dropped courses, no complete
  // combination can be built for the current course set.
  if (emptySlots.length > 0) {
    return { combinations, truncated, emptySlots, droppedSlots };
  }

  const chosen: string[] = [];
  const placed: Session[] = [];

  function recurse(index: number): void {
    if (truncated) return;
    if (performance.now() - start > timeBudgetMs || combinations.length >= maxResults) {
      truncated = true;
      return;
    }
    if (index === slots.length) {
      combinations.push({ groupIds: [...chosen], droppedSlots: [...droppedSlots] });
      return;
    }
    for (const opt of slots[index].options) {
      if (anyCollision(opt.sessions, placed)) continue;
      chosen.push(opt.group.id);
      const added = opt.sessions.length;
      for (const s of opt.sessions) placed.push(s);
      recurse(index + 1);
      for (let i = 0; i < added; i++) placed.pop();
      chosen.pop();
      if (truncated) return;
    }
  }

  recurse(0);

  return { combinations, truncated, emptySlots, droppedSlots };
}
