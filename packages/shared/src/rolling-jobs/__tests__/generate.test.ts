// packages/shared/src/rolling-jobs/__tests__/generate.test.ts
import { describe, it, expect } from "vitest";
import { generateOccurrences } from "../generate";
import type { Cadence } from "../../types/rollingJob";

// Helper — ISO date on noon UTC to avoid local-tz edge cases in the test.
const d = (s: string) => new Date(`${s}T12:00:00.000Z`);
const iso = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
const isoList = (dates: Date[]) => dates.map(iso);

describe("generateOccurrences - daily", () => {
  it("emits every day when interval=1", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-18"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
    ]);
  });

  it("respects interval=3", () => {
    const cadence: Cadence = { kind: "daily", interval: 3 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-28"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14", "2026-04-17", "2026-04-20", "2026-04-23", "2026-04-26",
    ]);
  });

  it("respects endDate exclusive upper bound <= horizon", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      endDate: d("2026-04-16"),
      horizonEnd: d("2026-04-30"),
    });
    expect(isoList(out)).toEqual(["2026-04-14", "2026-04-15", "2026-04-16"]);
  });

  it("skipBefore excludes already-materialized dates", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-18"),
      skipBefore: d("2026-04-17"),
    });
    expect(isoList(out)).toEqual(["2026-04-17", "2026-04-18"]);
  });
});

describe("generateOccurrences - weekly", () => {
  it("emits Tuesdays only when weekdays=[2], interval=1", () => {
    // 2026-04-14 is a Tuesday.
    const cadence: Cadence = { kind: "weekly", interval: 1, weekdays: [2] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-05-12"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14", "2026-04-21", "2026-04-28", "2026-05-05", "2026-05-12",
    ]);
  });

  it("emits multiple weekdays in order", () => {
    // Sun=0, Thu=4 — Israel work-week sample.
    const cadence: Cadence = { kind: "weekly", interval: 1, weekdays: [0, 2, 4] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-12"), // Sunday
      horizonEnd: d("2026-04-18"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-12", // Sun
      "2026-04-14", // Tue
      "2026-04-16", // Thu
    ]);
  });

  it("respects biweekly interval=2", () => {
    // Every other Tuesday, starting Tue 2026-04-14.
    const cadence: Cadence = { kind: "weekly", interval: 2, weekdays: [2] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-05-26"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14", "2026-04-28", "2026-05-12", "2026-05-26",
    ]);
  });

  it("startDate mid-week does not skip the first eligible day in that week", () => {
    // startDate is a Thursday; weekdays=[4 (Thu)]. First emission = that same day.
    const cadence: Cadence = { kind: "weekly", interval: 1, weekdays: [4] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-16"),
      horizonEnd: d("2026-04-30"),
    });
    expect(isoList(out)).toEqual(["2026-04-16", "2026-04-23", "2026-04-30"]);
  });
});

describe("generateOccurrences - monthly", () => {
  it("emits the same day-of-month each month", () => {
    const cadence: Cadence = { kind: "monthly", interval: 1, dayOfMonth: 15 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-01-15"),
      horizonEnd: d("2026-04-20"),
    });
    expect(isoList(out)).toEqual([
      "2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15",
    ]);
  });

  it("clamps day 31 to last day of short months", () => {
    const cadence: Cadence = { kind: "monthly", interval: 1, dayOfMonth: 31 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-01-31"),
      horizonEnd: d("2026-05-31"),
    });
    expect(isoList(out)).toEqual([
      "2026-01-31",
      "2026-02-28", // 2026 not leap
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("handles interval=2 (bi-monthly)", () => {
    const cadence: Cadence = { kind: "monthly", interval: 2, dayOfMonth: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-02-01"),
      horizonEnd: d("2026-08-01"),
    });
    expect(isoList(out)).toEqual([
      "2026-02-01", "2026-04-01", "2026-06-01", "2026-08-01",
    ]);
  });
});

describe("generateOccurrences - safety cap", () => {
  it("caps output at 400 occurrences", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-01-01"),
      horizonEnd: d("2030-01-01"), // would be ~1460 days
    });
    expect(out.length).toBe(400);
  });
});

describe("generateOccurrences - empty results", () => {
  it("returns [] when endDate is before startDate", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      endDate: d("2026-04-13"),
      horizonEnd: d("2026-04-30"),
    });
    expect(out).toEqual([]);
  });

  it("returns [] when horizonEnd is before startDate", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-13"),
    });
    expect(out).toEqual([]);
  });
});
