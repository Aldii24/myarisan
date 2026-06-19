import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Period lifecycle (tasks.md period work): closing the active period and opening
// the next one while keeping exactly one active period per arisan, plus the
// expired-subscription gate (PRD §8.3). @/db is mocked ONCE and the real logic in
// lib/periods.ts (and the real isSubscriptionExpired it calls) runs against a
// table-aware fake whose behaviour is swapped per test.

const MINUTE = 60 * 1000;

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

type PeriodsModule = typeof import("@/lib/periods");
type Tables = typeof import("@/db/schema");

let periods: PeriodsModule;
let schema: Tables;

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  schema = await import("@/db/schema");
  periods = await import("@/lib/periods");
});

afterEach(() => {
  respond = () => undefined;
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

function paidSubscriptionRow(planId: string, currentPeriodEnd: Date) {
  return {
    plan: {
      id: planId,
      maxMembers: 15,
      monthlyProofLimit: 75,
      name: planId,
      price: 0,
    },
    subscription: {
      arisanGroupId: "arisan-1",
      createdAt: new Date(),
      currentPeriodEnd,
      planId,
      status: "active",
    },
  };
}

describe("computeNextDueDate", () => {
  test("monthly advances to the same day next month", () => {
    assert.equal(
      periods.computeNextDueDate("monthly", "2026-06-10", 10),
      "2026-07-10",
    );
  });

  test("monthly rolls over December into the next year", () => {
    assert.equal(
      periods.computeNextDueDate("monthly", "2026-12-10", 10),
      "2027-01-10",
    );
  });

  test("weekly advances exactly 7 days (dueDay is irrelevant)", () => {
    assert.equal(
      periods.computeNextDueDate("weekly", "2026-06-19", 1),
      "2026-06-26",
    );
  });

  test("monthly without a current period anchors on fromDate", () => {
    const from = new Date("2026-06-15T00:00:00.000Z");
    assert.equal(
      periods.computeNextDueDate("monthly", null, 5, from),
      "2026-07-05",
    );
  });
});

describe("startNextPeriod", () => {
  test("blocks when the paid subscription has lapsed", async () => {
    const past = new Date(Date.now() - MINUTE);
    setDb(({ op, table }) => {
      if (op === "select" && table === schema.arisanGroups) {
        return [{ dueDay: 10, periodType: "monthly" }];
      }
      if (op === "select" && table === schema.subscriptions) {
        return [paidSubscriptionRow("basic", past)];
      }
      return undefined;
    });

    const result = await periods.startNextPeriod({
      actorUserId: "user-1",
      arisanId: "arisan-1",
    });

    assert.deepEqual(result, { ok: false, reason: "expired" });
  });

  test("returns not_found when the arisan does not exist", async () => {
    setDb(({ op, table }) =>
      op === "select" && table === schema.arisanGroups ? [] : undefined,
    );

    const result = await periods.startNextPeriod({
      actorUserId: "user-1",
      arisanId: "missing",
    });

    assert.deepEqual(result, { ok: false, reason: "not_found" });
  });

  test("closes the active period and opens the next one", async () => {
    let closedActivePeriod = false;
    let insertedNewPeriod = false;

    setDb((ctx) => {
      const { op, table } = ctx;

      if (op === "select" && table === schema.arisanGroups) {
        return [{ dueDay: 10, periodType: "monthly" }];
      }
      // No subscription row -> not expired (Free group).
      if (op === "select" && table === schema.subscriptions) {
        return [];
      }
      if (op === "select" && table === schema.periods) {
        return [{ dueDate: "2026-06-10", id: "p1", name: "Juni 2026" }];
      }
      if (op === "update" && table === schema.periods) {
        closedActivePeriod = true;
        return undefined;
      }
      if (op === "insert" && table === schema.periods) {
        insertedNewPeriod = true;
        return [{ id: "p2" }];
      }
      return undefined;
    });

    const result = await periods.startNextPeriod({
      actorUserId: "user-1",
      arisanId: "arisan-1",
    });

    assert.equal(result.ok, true);
    assert.equal(closedActivePeriod, true, "active period should be closed");
    assert.equal(insertedNewPeriod, true, "a new period should be inserted");

    if (result.ok) {
      assert.equal(result.closedPeriodName, "Juni 2026");
      assert.equal(result.newPeriodId, "p2");
      assert.equal(result.newPeriodName, "Juli 2026");
    }
  });
});
