// apps/web/lib/rollingJobs/__tests__/materialize.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Cadence } from "@seder/shared";

// Mock the DB client before importing the module under test.
const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => ({
  incomeEntries: { rollingJobId: "col.rollingJobId", date: "col.date" },
  rollingJobs: {},
}));

import { materializeRollingJob, type RollingJobForMaterialize } from "../materialize";

const baseJob: RollingJobForMaterialize = {
  id: "job-1",
  userId: "user-1",
  description: "Piano — Dan",
  clientId: null,
  clientName: "Dan",
  categoryId: null,
  amountGross: "150.00",
  vatRate: "18.00",
  includesVat: true,
  defaultInvoiceStatus: "draft",
  cadence: { kind: "weekly", interval: 1, weekdays: [2] } as Cadence,
  startDate: "2026-04-14",
  endDate: null,
  notes: null,
};

describe("materializeRollingJob", () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  it("generates future rows up to horizonEnd when no prior materialization", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: null }]),
      }),
    });
    const insertChain = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 5 }),
      }),
    };
    mockDb.insert.mockReturnValue(insertChain);

    const count = await materializeRollingJob(baseJob, {
      horizonEnd: new Date("2026-05-12T12:00:00Z"),
      today: new Date("2026-04-14T12:00:00Z"),
    });

    expect(count).toBe(5);
    const rowsInserted = insertChain.values.mock.calls[0][0];
    expect(rowsInserted).toHaveLength(5);
    expect(rowsInserted[0]).toMatchObject({
      rollingJobId: "job-1",
      userId: "user-1",
      description: "Piano — Dan",
      amountGross: "150.00",
      invoiceStatus: "draft",
      paymentStatus: "unpaid",
      amountPaid: "0",
      detachedFromTemplate: false,
    });
  });

  it("is idempotent — skipBefore prevents re-emitting already-materialized rows", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: "2026-04-21" }]),
      }),
    });
    const insertChain = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 3 }),
      }),
    };
    mockDb.insert.mockReturnValue(insertChain);

    const count = await materializeRollingJob(baseJob, {
      horizonEnd: new Date("2026-05-12T12:00:00Z"),
      today: new Date("2026-04-21T12:00:00Z"),
    });

    expect(count).toBe(3);
    const rowsInserted = insertChain.values.mock.calls[0][0];
    expect(rowsInserted.map((r: any) => r.date)).toEqual([
      "2026-04-28", "2026-05-05", "2026-05-12",
    ]);
  });

  it("returns 0 and skips insert when there are no new occurrences", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: "2026-05-12" }]),
      }),
    });

    const count = await materializeRollingJob(baseJob, {
      horizonEnd: new Date("2026-05-12T12:00:00Z"),
      today: new Date("2026-05-12T12:00:00Z"),
    });

    expect(count).toBe(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("honors endDate hard stop", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: null }]),
      }),
    });
    const insertChain = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 2 }),
      }),
    };
    mockDb.insert.mockReturnValue(insertChain);

    await materializeRollingJob(
      { ...baseJob, endDate: "2026-04-21" },
      {
        horizonEnd: new Date("2026-12-31T12:00:00Z"),
        today: new Date("2026-04-14T12:00:00Z"),
      },
    );

    const rows = insertChain.values.mock.calls[0][0];
    expect(rows.map((r: any) => r.date)).toEqual(["2026-04-14", "2026-04-21"]);
  });
});
