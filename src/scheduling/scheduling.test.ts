import { describe, expect, it } from "vitest";
import type { Course, Group, Session } from "../types";
import { sessionsCollide } from "./collision";
import { generateCombinations } from "./generateCombinations";
import { computeMetrics, rankCombinations } from "./ranking";
import { DEFAULT_CRITERIA } from "../types";

function session(p: Partial<Session>): Session {
  return {
    id: Math.random().toString(36).slice(2),
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "09:30",
    weekParity: "every",
    ...p,
  };
}

describe("sessionsCollide", () => {
  it("overlapping same-day sessions collide", () => {
    const a = session({ startTime: "08:00", endTime: "10:00" });
    const b = session({ startTime: "09:00", endTime: "11:00" });
    expect(sessionsCollide(a, b)).toBe(true);
  });

  it("touching endpoints do not collide", () => {
    const a = session({ startTime: "08:00", endTime: "10:00" });
    const b = session({ startTime: "10:00", endTime: "12:00" });
    expect(sessionsCollide(a, b)).toBe(false);
  });

  it("different days never collide", () => {
    const a = session({ dayOfWeek: 1 });
    const b = session({ dayOfWeek: 2 });
    expect(sessionsCollide(a, b)).toBe(false);
  });

  it("opposite parities never collide even at same time", () => {
    const a = session({ weekParity: "odd" });
    const b = session({ weekParity: "even" });
    expect(sessionsCollide(a, b)).toBe(false);
  });

  it("same parity at same time collides", () => {
    const a = session({ weekParity: "odd" });
    const b = session({ weekParity: "odd" });
    expect(sessionsCollide(a, b)).toBe(true);
  });

  it("every-week collides with a specific parity at same time", () => {
    const a = session({ weekParity: "every" });
    const b = session({ weekParity: "odd" });
    expect(sessionsCollide(a, b)).toBe(true);
  });
});

// --- Fixtures for combination generation ---

function course(id: string, p: Partial<Course> = {}): Course {
  return {
    id,
    name: id,
    color: "blue",
    componentTypes: ["lecture"],
    included: true,
    droppableComponents: [],
    ...p,
  };
}

function group(id: string, courseId: string, sessions: Session[]): Group {
  return { id, courseId, type: "lecture", label: id, sessions };
}

describe("generateCombinations", () => {
  it("produces the Cartesian product when nothing collides", () => {
    const courses = [course("A"), course("B")];
    const groups = [
      group("a1", "A", [session({ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" })]),
      group("a2", "A", [session({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" })]),
      group("b1", "B", [session({ dayOfWeek: 2, startTime: "08:00", endTime: "09:00" })]),
    ];
    const res = generateCombinations(courses, groups);
    // 2 options for A × 1 for B = 2 combinations
    expect(res.combinations).toHaveLength(2);
    expect(res.emptySlots.length).toBe(0);
  });

  it("prunes colliding combinations", () => {
    const courses = [course("A"), course("B")];
    const groups = [
      group("a1", "A", [session({ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" })]),
      group("b1", "B", [session({ dayOfWeek: 1, startTime: "09:00", endTime: "11:00" })]), // collides with a1
      group("b2", "B", [session({ dayOfWeek: 1, startTime: "10:00", endTime: "11:00" })]), // ok
    ];
    const res = generateCombinations(courses, groups);
    expect(res.combinations).toHaveLength(1);
    expect(res.combinations[0].groupIds.sort()).toEqual(["a1", "b2"]);
  });

  it("reports empty slots for a required component with no groups", () => {
    const courses = [course("A", { componentTypes: ["lecture", "lab"] })];
    const groups = [group("a1", "A", [session({})])];
    const res = generateCombinations(courses, groups);
    expect(res.combinations).toHaveLength(0);
    expect(res.emptySlots).toEqual([{ courseId: "A", type: "lab" }]);
  });

  it("ignores excluded courses", () => {
    const courses = [course("A"), course("B", { included: false })];
    const groups = [
      group("a1", "A", [session({})]),
      group("b1", "B", [session({ dayOfWeek: 1, startTime: "08:00", endTime: "09:30" })]),
    ];
    const res = generateCombinations(courses, groups);
    expect(res.combinations).toHaveLength(1);
    expect(res.combinations[0].groupIds).toEqual(["a1"]);
  });
});

describe("ranking", () => {
  it("computes gaps, free days and days used", () => {
    const groups = [
      group("g", "A", [
        session({ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }),
        session({ dayOfWeek: 1, startTime: "11:00", endTime: "12:00" }), // 2h gap
      ]),
    ];
    const byId = new Map(groups.map((g) => [g.id, g]));
    const m = computeMetrics({ groupIds: ["g"], droppedSlots: [] }, byId);
    expect(m.gapMinutes).toBe(120);
    expect(m.daysUsed).toBe(1);
    expect(m.freeDays).toBe(4); // Mon used, Tue–Fri free
  });

  it("ranks a gap-free plan above a plan with gaps", () => {
    const noGap = group("noGap", "A", [
      session({ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }),
      session({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }),
    ]);
    const bigGap = group("bigGap", "A", [
      session({ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }),
      session({ dayOfWeek: 1, startTime: "15:00", endTime: "16:00" }),
    ]);
    const byId = new Map([noGap, bigGap].map((g) => [g.id, g]));
    const ranked = rankCombinations(
      [
        { groupIds: ["bigGap"], droppedSlots: [] },
        { groupIds: ["noGap"], droppedSlots: [] },
      ],
      byId,
      { criteria: DEFAULT_CRITERIA },
    );
    expect(ranked[0].combination.groupIds).toEqual(["noGap"]);
  });
});
