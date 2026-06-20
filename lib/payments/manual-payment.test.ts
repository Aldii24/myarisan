import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Admin-recorded manual payment core (PRD §7.3 fallback when the auto-proof
// quota is exhausted), shared by the dashboard form and the WhatsApp
// `catat bayar` flow. @/db is faked; audit + subscription gate are stubbed so
// these tests isolate the membership / period / already-paid guard logic.

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

let expired = false;

let manual: typeof import("@/lib/payments/manual-payment");
let schema: typeof import("@/db/schema");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("@/lib/audit", {
    namedExports: { createAuditLog: async () => {} },
  });
  mock.module("@/lib/subscription", {
    namedExports: { isSubscriptionExpired: async () => expired },
  });
  mock.module("@/lib/arisan", {
    namedExports: {
      isPaidStatus: (status: string | null | undefined) =>
        status === "confirmed" || status === "manual",
    },
  });
  schema = await import("@/db/schema");
  manual = await import("@/lib/payments/manual-payment");
});

afterEach(() => {
  respond = () => undefined;
  expired = false;
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

const memberRow = { displayName: "Siti" };
const activePeriodRow = { id: "period-1", name: "Juni 2026" };

// Responder that walks the recordManualPayment query sequence: membership →
// active period → existing payment → insert/update. `existingPayment` lets a
// test inject a prior payment row (or null for none).
function happyPathResponder(options: {
  existingPayment?: { id: string; amount: number | null; status: string } | null;
} = {}): FakeDbResponder {
  const existingPayment = options.existingPayment ?? null;

  return (ctx) => {
    if (ctx.op === "select" && ctx.table === schema.memberships) {
      return [memberRow];
    }
    if (ctx.op === "select" && ctx.table === schema.periods) {
      return [activePeriodRow];
    }
    if (ctx.op === "select" && ctx.table === schema.payments) {
      return existingPayment ? [existingPayment] : [];
    }
    if (ctx.op === "insert" && ctx.table === schema.payments) {
      return [{ id: "new-payment-1" }];
    }
    if (ctx.op === "update" && ctx.table === schema.payments) {
      return [{ id: existingPayment?.id ?? "updated-payment-1" }];
    }
    return undefined;
  };
}

const baseInput = {
  actorUserId: "admin-1",
  amount: 100000,
  arisanId: "arisan-1",
  memberUserId: "member-1",
};

describe("recordManualPayment", () => {
  test("rejects a non-positive amount without touching the db", async () => {
    let wrote = false;
    setDb((ctx) => {
      if (ctx.op === "insert" || ctx.op === "update") {
        wrote = true;
      }
      return undefined;
    });

    const result = await manual.recordManualPayment({ ...baseInput, amount: 0 });

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "invalid_amount");
    assert.equal(wrote, false);
  });

  test("blocks when the subscription is expired", async () => {
    expired = true;
    let wrote = false;
    setDb((ctx) => {
      if (ctx.op === "insert" || ctx.op === "update") {
        wrote = true;
      }
      return undefined;
    });

    const result = await manual.recordManualPayment(baseInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "expired");
    assert.equal(wrote, false);
  });

  test("fails when the member is not in the arisan", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships ? [] : undefined,
    );

    const result = await manual.recordManualPayment(baseInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "not_member");
  });

  test("fails when there is no active period", async () => {
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return [memberRow];
      }
      if (ctx.op === "select" && ctx.table === schema.periods) {
        return [];
      }
      return undefined;
    });

    const result = await manual.recordManualPayment(baseInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "no_active_period");
  });

  test("refuses to overwrite a payment already marked paid", async () => {
    let wrote = false;
    setDb((ctx) => {
      if (ctx.op === "insert" || ctx.op === "update") {
        wrote = true;
      }
      return happyPathResponder({
        existingPayment: { amount: 100000, id: "p-old", status: "confirmed" },
      })(ctx);
    });

    const result = await manual.recordManualPayment(baseInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "already_paid");
    assert.equal(wrote, false);
  });

  test("inserts a new manual payment when none exists", async () => {
    let inserted = false;
    setDb((ctx) => {
      if (ctx.op === "insert" && ctx.table === schema.payments) {
        inserted = true;
      }
      return happyPathResponder()(ctx);
    });

    const result = await manual.recordManualPayment(baseInput);

    assert.equal(result.ok, true);
    assert.equal(inserted, true);
    assert.equal(result.ok === true && result.memberDisplayName, "Siti");
    assert.equal(result.ok === true && result.periodName, "Juni 2026");
    assert.equal(result.ok === true && result.amount, 100000);
  });

  test("updates an existing unpaid payment in place", async () => {
    let updated = false;
    let inserted = false;
    setDb((ctx) => {
      if (ctx.op === "update" && ctx.table === schema.payments) {
        updated = true;
      }
      if (ctx.op === "insert" && ctx.table === schema.payments) {
        inserted = true;
      }
      return happyPathResponder({
        existingPayment: { amount: null, id: "p-pending", status: "pending" },
      })(ctx);
    });

    const result = await manual.recordManualPayment(baseInput);

    assert.equal(result.ok, true);
    assert.equal(updated, true);
    assert.equal(inserted, false);
  });
});
