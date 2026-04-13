// packages/shared/src/rolling-jobs/__tests__/parseRRule.test.ts
import { describe, it, expect } from "vitest";
import { parseGoogleRRule } from "../parseRRule";

describe("parseGoogleRRule - daily", () => {
  it("parses FREQ=DAILY with default interval", () => {
    expect(parseGoogleRRule("RRULE:FREQ=DAILY")).toEqual({ kind: "daily", interval: 1 });
  });

  it("parses FREQ=DAILY;INTERVAL=3", () => {
    expect(parseGoogleRRule("RRULE:FREQ=DAILY;INTERVAL=3")).toEqual({ kind: "daily", interval: 3 });
  });
});

describe("parseGoogleRRule - weekly", () => {
  it("parses FREQ=WEEKLY with no BYDAY", () => {
    // Without BYDAY, fall back to single weekday from dtstart — we return null and let caller prefill.
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY")).toBeNull();
  });

  it("parses BYDAY=TU (single day)", () => {
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY;BYDAY=TU")).toEqual({
      kind: "weekly",
      interval: 1,
      weekdays: [2],
    });
  });

  it("parses BYDAY=SU,TU,TH (multiple)", () => {
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY;BYDAY=SU,TU,TH")).toEqual({
      kind: "weekly",
      interval: 1,
      weekdays: [0, 2, 4],
    });
  });

  it("parses INTERVAL=2", () => {
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU")).toEqual({
      kind: "weekly",
      interval: 2,
      weekdays: [2],
    });
  });
});

describe("parseGoogleRRule - monthly", () => {
  it("parses FREQ=MONTHLY;BYMONTHDAY=15", () => {
    expect(parseGoogleRRule("RRULE:FREQ=MONTHLY;BYMONTHDAY=15")).toEqual({
      kind: "monthly",
      interval: 1,
      dayOfMonth: 15,
    });
  });

  it("parses FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1", () => {
    expect(parseGoogleRRule("RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1")).toEqual({
      kind: "monthly",
      interval: 2,
      dayOfMonth: 1,
    });
  });

  it("returns null for BYDAY-driven monthly (first Saturday, etc.)", () => {
    // Unsupported in v1.
    expect(parseGoogleRRule("RRULE:FREQ=MONTHLY;BYDAY=1SA")).toBeNull();
  });
});

describe("parseGoogleRRule - unsupported", () => {
  it("returns null for FREQ=YEARLY", () => {
    expect(parseGoogleRRule("RRULE:FREQ=YEARLY")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseGoogleRRule("")).toBeNull();
    expect(parseGoogleRRule("not-an-rrule")).toBeNull();
    expect(parseGoogleRRule("RRULE:FREQ=DAILY;INTERVAL=abc")).toBeNull();
  });

  it("accepts an array of RRULE strings (Google returns string[])", () => {
    // Sometimes events.recurrence is `["RRULE:FREQ=WEEKLY;BYDAY=TU", "EXDATE:..."]`.
    expect(parseGoogleRRule(["RRULE:FREQ=WEEKLY;BYDAY=TU", "EXDATE:20260421T120000Z"])).toEqual({
      kind: "weekly",
      interval: 1,
      weekdays: [2],
    });
  });
});
