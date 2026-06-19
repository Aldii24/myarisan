import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Subscription gating (tasks.md #14): member limits, monthly automatic-proof
// limits, and the "expired paid plan" lock. The real branch logic in
// lib/subscription.ts runs unchanged against a table-aware fake db.
//
// @/db is mocked ONCE with a fake whose behaviour is swapped per test via a
// mutable responder. Re-mocking + re-importing per test would not work: the
// subscription module is cached after first import and keeps its original db
// binding, so a single shared mock is the reliable approach.

const MINUTE = 60 * 1000;

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

type SubscriptionModule = typeof import("@/lib/subscription");
type Tables = typeof import("@/db/schema");

let subscription: SubscriptionModule;
let schema: Tables;

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  schema = await import("@/db/schema");
  subscription = await import("@/lib/subscription");
});

afterEach(() => {
  respond = () => undefined;
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

describe("usage-month + date helpers", () => {
  test("getCurrentUsageMonth formats YYYY-MM in local time", () => {
    assert.equal(subscription.getCurrentUsageMonth(new Date(2026, 5, 19)), "2026-06");
    assert.equal(subscription.getCurrentUsageMonth(new Date(2026, 0, 3)), "2026-01");
  });

  test("addDays does not mutate the input date", () => {
    const base = new Date("2026-06-19T00:00:00.000Z");
    const result = subscription.addDays(base, 30);
    assert.equal(base.toISOString(), "2026-06-19T00:00:00.000Z");
    assert.equal(result.getTime() - base.getTime(), 30 * 24 * 60 * MINUTE);
  });
});

describe("getCurrentPlan / getActiveSubscription", () => {
  test("active paid subscription yields its plan", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * MINUTE);
    setDb(({ op, table }) =>
      op === "select" && table === schema.subscriptions
        ? [paidRow("pro", "active", future)]
        : undefined,
    );

    const plan = await subscription.getCurrentPlan("arisan-1");
    assert.equal(plan.id, "pro");
    assert.equal(await subscription.isSubscriptionActive("arisan-1"), true);
  });

  test("expired paid subscription falls back to the Free plan", async () => {
    const past = new Date(Date.now() - MINUTE);
    setDb(({ op, table }) => {
      if (op === "select" && table === schema.subscriptions) {
        return [paidRow("pro", "active", past)];
      }
      if (op === "select" && table === schema.plans) {
        return [{ id: "free", maxMembers: 5, monthlyProofLimit: 10, name: "Free", price: 0 }];
      }
      return undefined;
    });

    const plan = await subscription.getCurrentPlan("arisan-1");
    assert.equal(plan.id, "free");
    assert.equal(await subscription.isSubscriptionActive("arisan-1"), false);
  });
});

describe("isSubscriptionExpired (PRD §8.3)", () => {
  test("true only for a lapsed paid plan", async () => {
    const past = new Date(Date.now() - MINUTE);
    setDb(({ op, table }) =>
      op === "select" && table === schema.subscriptions
        ? [paidRow("basic", "active", past)]
        : undefined,
    );
    assert.equal(await subscription.isSubscriptionExpired("arisan-1"), true);
  });

  test("false for an active paid plan", async () => {
    const future = new Date(Date.now() + MINUTE);
    setDb(({ op, table }) =>
      op === "select" && table === schema.subscriptions
        ? [paidRow("basic", "active", future)]
        : undefined,
    );
    assert.equal(await subscription.isSubscriptionExpired("arisan-1"), false);
  });

  test("false for a Free group that never paid", async () => {
    const future = new Date(Date.now() + MINUTE);
    setDb(({ op, table }) =>
      op === "select" && table === schema.subscriptions
        ? [paidRow("free", "trial", future)]
        : undefined,
    );
    assert.equal(await subscription.isSubscriptionExpired("arisan-1"), false);
  });
});

describe("canAddMember (member limit enforcement)", () => {
  test("allows when staying within the plan limit", async () => {
    const future = new Date(Date.now() + MINUTE);
    setDb(({ op, table }) => {
      if (op === "select" && table === schema.subscriptions) {
        return [paidRow("basic", "active", future)]; // basic: 15 members
      }
      if (op === "select" && table === schema.memberships) {
        return [{ value: 10 }];
      }
      return undefined;
    });

    const result = await subscription.canAddMember("arisan-1", 1);
    assert.equal(result.allowed, true);
    assert.equal(result.limit, 15);
    assert.equal(result.currentMemberCount, 10);
  });

  test("blocks when the addition would exceed the limit", async () => {
    const future = new Date(Date.now() + MINUTE);
    setDb(({ op, table }) => {
      if (op === "select" && table === schema.subscriptions) {
        return [paidRow("free", "trial", future)]; // free: 5 members
      }
      if (op === "select" && table === schema.memberships) {
        return [{ value: 5 }];
      }
      return undefined;
    });

    const result = await subscription.canAddMember("arisan-1", 1);
    assert.equal(result.allowed, false);
    assert.equal(result.limit, 5);
  });
});

describe("canUseAutomaticProof (monthly proof limit + expiry)", () => {
  test("blocks with reason 'expired' for a lapsed paid plan", async () => {
    const past = new Date(Date.now() - MINUTE);
    setDb(({ op, table }) =>
      op === "select" && table === schema.subscriptions
        ? [paidRow("pro", "active", past)]
        : undefined,
    );

    const result = await subscription.canUseAutomaticProof("arisan-1");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "expired");
  });

  test("blocks with reason 'quota' when the monthly limit is reached", async () => {
    const future = new Date(Date.now() + MINUTE);
    setDb(({ op, table }) => {
      if (op === "select" && table === schema.subscriptions) {
        return [paidRow("free", "trial", future)]; // free: 10 proofs
      }
      if (op === "select" && table === schema.usageCounters) {
        return [{ proofLimit: 10, proofUsed: 10 }];
      }
      return undefined; // insert into usageCounters resolves to default
    });

    const result = await subscription.canUseAutomaticProof("arisan-1");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "quota");
    assert.equal(result.limit, 10);
  });

  test("allows when under the monthly limit", async () => {
    const future = new Date(Date.now() + MINUTE);
    setDb(({ op, table }) => {
      if (op === "select" && table === schema.subscriptions) {
        return [paidRow("free", "trial", future)];
      }
      if (op === "select" && table === schema.usageCounters) {
        return [{ proofLimit: 10, proofUsed: 3 }];
      }
      return undefined;
    });

    const result = await subscription.canUseAutomaticProof("arisan-1");
    assert.equal(result.allowed, true);
    assert.equal(result.reason, null);
    assert.equal(result.used, 3);
  });
});

describe("getExportCapabilities", () => {
  async function capsForPlan(planId: string) {
    const future = new Date(Date.now() + MINUTE);
    setDb(({ op, table }) =>
      op === "select" && table === schema.subscriptions
        ? [paidRow(planId, planId === "free" ? "trial" : "active", future)]
        : undefined,
    );
    const caps = await subscription.getExportCapabilities("arisan-1");
    return { excel: caps.excel, pdf: caps.pdf };
  }

  test("Free plan locks PDF and Excel", async () => {
    assert.deepEqual(await capsForPlan("free"), { pdf: false, excel: false });
  });

  test("Basic unlocks PDF but not Excel", async () => {
    assert.deepEqual(await capsForPlan("basic"), { pdf: true, excel: false });
  });

  test("Pro unlocks PDF and Excel", async () => {
    assert.deepEqual(await capsForPlan("pro"), { pdf: true, excel: true });
  });
});

// --- fixtures -------------------------------------------------------------

function paidRow(planId: string, status: string, currentPeriodEnd: Date) {
  return {
    plan: {
      id: planId,
      maxMembers: { free: 5, basic: 15, pro: 30, premium: 75 }[planId] ?? 5,
      monthlyProofLimit: { free: 10, basic: 75, pro: 150, premium: 375 }[planId] ?? 10,
      name: planId,
      price: 0,
    },
    subscription: {
      arisanGroupId: "arisan-1",
      createdAt: new Date(),
      currentPeriodEnd,
      planId,
      status,
    },
  };
}
