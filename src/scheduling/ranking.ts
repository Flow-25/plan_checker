import type {
  Combination,
  CombinationMetrics,
  CriteriaOrder,
  CriterionKey,
  Group,
  RankedCombination,
  Session,
} from "../types";
import { toMinutes } from "../utils/time";

/**
 * Compute the four raw metrics (§6.1) for a combination.
 * Weekend days (Sat/Sun) only count toward "free days" if the schedule
 * actually uses a weekend day, matching the plan's intent.
 */
export function computeMetrics(
  combination: Combination,
  groupsById: Map<string, Group>,
): CombinationMetrics {
  // Gather sessions grouped by day.
  const byDay = new Map<number, Session[]>();
  for (const gid of combination.groupIds) {
    const group = groupsById.get(gid);
    if (!group) continue;
    for (const s of group.sessions) {
      const arr = byDay.get(s.dayOfWeek) ?? [];
      arr.push(s);
      byDay.set(s.dayOfWeek, arr);
    }
  }

  let gapMinutes = 0;
  let startSum = 0;
  let endSum = 0;
  const daysUsed = byDay.size;

  let usesWeekend = false;
  for (const day of byDay.keys()) if (day >= 6) usesWeekend = true;

  for (const [, sessions] of byDay) {
    const sorted = sessions
      .map((s) => ({ start: toMinutes(s.startTime), end: toMinutes(s.endTime) }))
      .filter((s) => !Number.isNaN(s.start) && !Number.isNaN(s.end))
      .sort((a, b) => a.start - b.start);
    if (sorted.length === 0) continue;

    const dayStart = sorted[0].start;
    const dayEnd = sorted[sorted.length - 1].end;
    startSum += dayStart;
    endSum += dayEnd;

    // Gap = idle time between consecutive classes. Walk sessions in start
    // order, accumulating any uncovered time before each session begins.
    let cursor = sorted[0].start;
    for (const s of sorted) {
      if (s.start > cursor) {
        gapMinutes += s.start - cursor;
        cursor = s.end;
      } else if (s.end > cursor) {
        cursor = s.end;
      }
    }
  }

  const totalDays = usesWeekend ? 7 : 5;
  const freeDays = Math.max(0, totalDays - daysUsed);

  return { gapMinutes, freeDays, startSum, endSum, daysUsed };
}

/** Direction each metric should be optimized: true = higher is better. */
const HIGHER_IS_BETTER: Record<CriterionKey, boolean> = {
  minGaps: false, // lower gap minutes is better
  maxFreeDays: true, // more free days is better
  lateStartEarlyFinish: false, // handled via a combined start/end score below
  minDays: false, // fewer days is better
};

/** Extract the comparable raw value a criterion optimizes. */
function rawValue(key: CriterionKey, m: CombinationMetrics): number {
  switch (key) {
    case "minGaps":
      return m.gapMinutes;
    case "maxFreeDays":
      return m.freeDays;
    case "minDays":
      return m.daysUsed;
    case "lateStartEarlyFinish":
      // Later starts (higher startSum) and earlier finishes (lower endSum) are
      // both good. Combine as (endSum - startSum): smaller is better.
      return m.endSum - m.startSum;
  }
}

export interface RankOptions {
  criteria: CriteriaOrder;
}

/**
 * Rank combinations: compute metrics, normalize each enabled criterion to
 * [0,1] across the set, then weighted-sum using priority order (§6.3).
 * Weight for the criterion at position i (0-based) = 1/(i+1).
 */
export function rankCombinations(
  combinations: Combination[],
  groupsById: Map<string, Group>,
  opts: RankOptions,
): RankedCombination[] {
  const metricsList = combinations.map((c) => computeMetrics(c, groupsById));
  const enabled = opts.criteria.filter((c) => c.enabled);

  // Precompute min/max per enabled criterion for normalization.
  const ranges = new Map<CriterionKey, { min: number; max: number }>();
  for (const { key } of enabled) {
    let min = Infinity;
    let max = -Infinity;
    for (const m of metricsList) {
      const v = rawValue(key, m);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ranges.set(key, { min, max });
  }

  const ranked: RankedCombination[] = combinations.map((combination, idx) => {
    const metrics = metricsList[idx];
    let score = 0;
    enabled.forEach(({ key }, position) => {
      const { min, max } = ranges.get(key)!;
      const raw = rawValue(key, metrics);
      // Normalize to [0,1] where 1 = best.
      let norm: number;
      if (max === min) {
        norm = 1; // all equal → neutral-good, contributes uniformly
      } else {
        const scaled = (raw - min) / (max - min);
        // For lateStartEarlyFinish, rawValue is already "smaller is better".
        norm = HIGHER_IS_BETTER[key] ? scaled : 1 - scaled;
      }
      const weight = 1 / (position + 1);
      score += weight * norm;
    });
    return { combination, metrics, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
