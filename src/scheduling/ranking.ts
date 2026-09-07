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
 * Compute the raw metrics for one parity week of a combination.
 * Weekend days (Sat/Sun) only count toward "free days" if the schedule
 * actually uses a weekend day, matching the plan's intent.
 */
function computeWeekMetrics(
  combination: Combination,
  groupsById: Map<string, Group>,
  parity: "odd" | "even",
): CombinationMetrics {
  // Gather sessions grouped by day.
  const byDay = new Map<number, Session[]>();
  for (const gid of combination.groupIds) {
    const group = groupsById.get(gid);
    if (!group) continue;
    for (const s of group.sessions.filter((item) => item.weekParity === "every" || item.weekParity === parity)) {
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

/** Score odd and even weeks separately, then use their mean experience. */
export function computeMetrics(
  combination: Combination,
  groupsById: Map<string, Group>,
): CombinationMetrics {
  const odd = computeWeekMetrics(combination, groupsById, "odd");
  const even = computeWeekMetrics(combination, groupsById, "even");
  return {
    gapMinutes: (odd.gapMinutes + even.gapMinutes) / 2,
    freeDays: (odd.freeDays + even.freeDays) / 2,
    startSum: (odd.startSum + even.startSum) / 2,
    endSum: (odd.endSum + even.endSum) / 2,
    daysUsed: (odd.daysUsed + even.daysUsed) / 2,
  };
}

/** Direction each metric should be optimized: true = higher is better. */
const HIGHER_IS_BETTER: Record<CriterionKey, boolean> = {
  minGaps: false, // lower gap minutes is better
  maxFreeDays: true, // more free days is better
  lateStartEarlyFinish: true, // handled separately as start + finish quality
};

/** Extract the comparable raw value a criterion optimizes. */
function rawValue(key: CriterionKey, m: CombinationMetrics): number {
  switch (key) {
    case "minGaps":
      return m.gapMinutes;
    case "maxFreeDays":
      return m.freeDays;
    case "lateStartEarlyFinish":
      return m.daysUsed ? m.startSum / m.daysUsed : 0;
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
        norm = HIGHER_IS_BETTER[key] ? scaled : 1 - scaled;
      }
      if (key === "lateStartEarlyFinish") {
        const starts = metricsList.map((m) => m.daysUsed ? m.startSum / m.daysUsed : 0);
        const finishes = metricsList.map((m) => m.daysUsed ? m.endSum / m.daysUsed : 0);
        const startMin = Math.min(...starts), startMax = Math.max(...starts);
        const endMin = Math.min(...finishes), endMax = Math.max(...finishes);
        const start = metrics.daysUsed ? metrics.startSum / metrics.daysUsed : 0;
        const end = metrics.daysUsed ? metrics.endSum / metrics.daysUsed : 0;
        const startQuality = startMax === startMin ? 1 : (start - startMin) / (startMax - startMin);
        const finishQuality = endMax === endMin ? 1 : 1 - (end - endMin) / (endMax - endMin);
        norm = (startQuality + finishQuality) / 2;
      }
      const weight = 1 / (position + 1);
      score += weight * norm;
    });
    return { combination, metrics, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
