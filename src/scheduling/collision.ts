import type { Session } from "../types";
import { toMinutes } from "../utils/time";

/**
 * Two week parities are compatible (i.e. the sessions can occur in the same
 * week) unless they are strictly opposite ("odd" vs "even"). "every" is
 * compatible with everything.
 */
export function parityCompatible(a: Session, b: Session): boolean {
  if (a.weekParity === "every" || b.weekParity === "every") return true;
  return a.weekParity === b.weekParity;
}

/** Do two sessions overlap in day + time, on weeks they can share? */
export function sessionsCollide(a: Session, b: Session): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  if (!parityCompatible(a, b)) return false;

  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);

  // Malformed times can't be reasoned about; treat as non-colliding so the
  // planner degrades gracefully (form validation surfaces the real problem).
  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;

  // Overlap (touching endpoints, e.g. 10:00 end vs 10:00 start, do NOT collide).
  return aStart < bEnd && bStart < aEnd;
}

/** Does any session in `candidate` collide with any already-placed session? */
export function anyCollision(candidate: Session[], placed: Session[]): boolean {
  for (const c of candidate) {
    for (const p of placed) {
      if (sessionsCollide(c, p)) return true;
    }
  }
  return false;
}
