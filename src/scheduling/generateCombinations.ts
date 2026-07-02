import type {
  Course,
  Group,
  Combination,
  ComponentType,
  DroppedSlot,
  Session,
} from "../types";
import { anyCollision } from "./collision";

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
      const options = groups
        .filter((g) => g.courseId === course.id && g.type === type)
        .map((group) => ({ group, sessions: group.sessions }));
      if (options.length === 0) {
        emptySlots.push({ courseId: course.id, type });
        continue;
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
