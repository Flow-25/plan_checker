import type {
  Course,
  CriteriaOrder,
  DroppedSlot,
  Group,
  RankedCombination,
} from "../types";
import { generateCombinations } from "./generateCombinations";
import { rankCombinations } from "./ranking";

export interface PlanOutcome {
  ranked: RankedCombination[];
  truncated: boolean;
  /** Required components with no groups (non-droppable), blocking a solution. */
  emptySlots: DroppedSlot[];
  /** Component slots dropped to obtain these results (empty on the primary attempt). */
  droppedSlots: DroppedSlot[];
  usedFallback: boolean;
  noSolution: boolean;
}

/** Enumerate subsets of `items` ordered by increasing size. */
function subsetsBySize<T>(items: T[]): T[][] {
  const result: T[][] = [];
  const n = items.length;
  for (let size = 0; size <= n; size++) {
    const combo: number[] = [];
    const build = (start: number, depth: number) => {
      if (depth === size) {
        result.push(combo.map((i) => items[i]));
        return;
      }
      for (let i = start; i < n; i++) {
        combo.push(i);
        build(i + 1, depth + 1);
        combo.pop();
      }
    };
    build(0, 0);
  }
  return result;
}

/**
 * Solve for the given data: try to schedule every component of every included
 * course; if that yields nothing and some components are marked droppable,
 * retry dropping the smallest set of droppable component slots that produces a
 * solution (§6.4). Dropping is per component (lecture/exercise/lab), so a single
 * clashing component can be set aside without discarding the whole course.
 */
export function planSchedules(
  courses: Course[],
  groups: Group[],
  criteria: CriteriaOrder,
): PlanOutcome {
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const included = courses.filter((c) => c.included);

  // Primary attempt: drop nothing.
  const primary = generateCombinations(courses, groups, {}, []);
  if (primary.combinations.length > 0) {
    return {
      ranked: rankCombinations(primary.combinations, groupsById, { criteria }),
      truncated: primary.truncated,
      emptySlots: primary.emptySlots,
      droppedSlots: [],
      usedFallback: false,
      noSolution: false,
    };
  }

  // Fallback: try dropping droppable component slots, smallest subsets first.
  const droppable: DroppedSlot[] = [];
  for (const c of included) {
    for (const type of c.droppableComponents) {
      if (c.componentTypes.includes(type))
        droppable.push({ courseId: c.id, type });
    }
  }
  if (droppable.length > 0 && droppable.length <= 12) {
    // Skip the empty subset (already tried as `primary`).
    for (const subset of subsetsBySize(droppable).slice(1)) {
      const attempt = generateCombinations(courses, groups, {}, subset);
      if (attempt.combinations.length > 0) {
        return {
          ranked: rankCombinations(attempt.combinations, groupsById, { criteria }),
          truncated: attempt.truncated,
          emptySlots: attempt.emptySlots,
          droppedSlots: subset,
          usedFallback: true,
          noSolution: false,
        };
      }
    }
  }

  // Nothing worked.
  return {
    ranked: [],
    truncated: primary.truncated,
    emptySlots: primary.emptySlots,
    droppedSlots: [],
    usedFallback: false,
    noSolution: true,
  };
}
