import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseUsosPlan } from "./parseUsosPlan";
import { planSchedules } from "../scheduling/plan";
import { DEFAULT_CRITERIA } from "../types";

const fixture = readFileSync(
  fileURLToPath(new URL("./__fixtures__/plan-sample.html", import.meta.url)),
  "utf-8",
);

describe("parseUsosPlan (real MIM UW plan)", () => {
  const res = parseUsosPlan(fixture);

  it("extracts all courses", () => {
    expect(res.summary.courseCount).toBe(6);
    const names = res.courses.map((c) => c.name);
    expect(names).toContain("Statystyka");
    expect(names).toContain("Analiza funkcjonalna");
  });

  it("captures alternative groups (Statystyka: 1 lecture, 4 exercise, 4 lab)", () => {
    const stat = res.courses.find((c) => c.name === "Statystyka")!;
    const groups = res.groups.filter((g) => g.courseId === stat.id);
    const byType = (t: string) => groups.filter((g) => g.type === t).length;
    expect(byType("lecture")).toBe(1);
    expect(byType("exercise")).toBe(4);
    expect(byType("lab")).toBe(4);
    expect(stat.componentTypes.sort()).toEqual(["exercise", "lab", "lecture"]);
  });

  it("reads odd/even week parity for lab groups", () => {
    const stat = res.courses.find((c) => c.name === "Statystyka")!;
    const labs = res.groups.filter(
      (g) => g.courseId === stat.id && g.type === "lab",
    );
    const parities = labs
      .flatMap((g) => g.sessions.map((s) => s.weekParity))
      .sort();
    expect(parities).toEqual(["even", "even", "odd", "odd"]);
  });

  it("reads day, time and room correctly for the lecture", () => {
    const stat = res.courses.find((c) => c.name === "Statystyka")!;
    const wyk = res.groups.find(
      (g) => g.courseId === stat.id && g.type === "lecture",
    )!;
    const s = wyk.sessions[0];
    expect(s.dayOfWeek).toBe(1); // Monday
    expect(s.startTime).toBe("08:30");
    expect(s.endTime).toBe("10:00");
    expect(s.location).toContain("3180");
  });

  it("assigns distinct colors and fresh ids", () => {
    const colors = new Set(res.courses.map((c) => c.color));
    expect(colors.size).toBe(res.courses.length);
    const ids = new Set(res.courses.map((c) => c.id));
    expect(ids.size).toBe(res.courses.length);
  });
});

describe("end-to-end: parsed plan feeds the scheduler", () => {
  it("defaults lectures to optional on import", () => {
    const res = parseUsosPlan(fixture);
    for (const c of res.courses) {
      if (c.componentTypes.includes("lecture"))
        expect(c.droppableComponents).toContain("lecture");
    }
  });

  it("with lectures forced mandatory, the 6 courses cannot co-exist", () => {
    // In this real shared plan, 'Wybrane zagadnienia...' (exercise, Fri 10:15)
    // and 'Analiza funkcjonalna' (lecture, Fri 10:15) both have a single group
    // and clash — so with nothing droppable, no full plan exists.
    const res = parseUsosPlan(fixture);
    for (const c of res.courses) c.droppableComponents = [];
    const outcome = planSchedules(res.courses, res.groups, DEFAULT_CRITERIA);
    expect(outcome.noSolution).toBe(true);
  });

  it("with default lecture-optional, the importer's plan is schedulable", () => {
    const res = parseUsosPlan(fixture);
    const outcome = planSchedules(res.courses, res.groups, DEFAULT_CRITERIA);
    expect(outcome.noSolution).toBe(false);
    expect(outcome.usedFallback).toBe(true);
    // The clash is resolved by dropping a single lecture.
    expect(outcome.droppedSlots.every((s) => s.type === "lecture")).toBe(true);
    expect(outcome.ranked.length).toBeGreaterThan(0);
  });

  it("finds ranked plans when only the conflicting component is droppable", () => {
    const res = parseUsosPlan(fixture);
    // Mark just Analiza funkcjonalna's LECTURE optional — its exercise is kept.
    const af = res.courses.find((c) => c.name === "Analiza funkcjonalna")!;
    af.droppableComponents = ["lecture"];
    const outcome = planSchedules(res.courses, res.groups, DEFAULT_CRITERIA);
    expect(outcome.noSolution).toBe(false);
    expect(outcome.usedFallback).toBe(true);
    // Exactly the AF lecture slot is dropped; the rest (incl. AF exercise) stay.
    expect(outcome.droppedSlots).toEqual([{ courseId: af.id, type: "lecture" }]);
    expect(outcome.ranked.length).toBeGreaterThan(0);
    // Total kept slots = all component slots minus the one dropped.
    const totalSlots = res.courses.reduce(
      (n, c) => n + c.componentTypes.length,
      0,
    );
    for (const r of outcome.ranked) {
      expect(r.combination.groupIds.length).toBe(totalSlots - 1);
    }
  });
});
