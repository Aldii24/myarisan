import assert from "node:assert/strict";
import { before, beforeEach, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Payment confirmation (tasks.md #8 / #14 / #17): an admin can confirm or reject
// a proof, but confirming a NEW payment is locked while the group's paid plan is
// expired (PRD §8.3). Editing the amount during confirmation must be recorded
// as a distinct audit action.
//
// @/db, the subscription gate, and the audit log are mocked; the real
// confirm/reject branch logic runs against them.

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

let expired = false;
const auditCalls: Array<{ action: string }> = [];

type Tables = typeof import("@/db/schema");
let schema: Tables;
let confirm: typeof import("@/lib/payments/confirm-payment");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("@/lib/subscription", {
    namedExports: { isSubscriptionExpired: async () => expired },
  });
  mock.module("@/lib/audit", {
    namedExports: {
      createAuditLog: async (input: { action: string }) => {
        auditCalls.push({ action: input.action });
      },
    },
  });

  schema = await import("@/db/schema");
  confirm = await import("@/lib/payments/confirm-payment");
});

beforeEach(() => {
  respond = () => undefined;
  expired = false;
  auditCalls.length = 0;
});

// Returns the existing payment for loadPayment, and echoes the update's `set`
// payload back through .returning() — mirroring a real UPDATE ... RETURNING.
function withPayment(existing: Record<string, unknown> | null) {
  respond = ({ op, table, args }) => {
    if (op === "select" && table === schema.payments) {
      return existing ? [existing] : [];
    }
    if (op === "update" && table === schema.payments) {
      const set = (args.set?.[0] as Record<string, unknown>) ?? {};
      return [{ id: existing?.id ?? "p1", ...existing, ...set }];
    }
    return undefined;
  };
}

describe("confirmPaymentById", () => {
  const base = {
    arisanId: "a1",
    actorUserId: "admin-1",
    paymentId: "p1",
  };

  test("returns not_found when the payment does not belong to the group", async () => {
    withPayment(null);
    const result = await confirm.confirmPaymentById({ ...base, amount: 100_000 });
    assert.deepEqual(result, { ok: false, reason: "not_found" });
    assert.equal(auditCalls.length, 0);
  });

  test("is locked when the paid plan is expired", async () => {
    expired = true;
    withPayment({ id: "p1", amount: 100_000, status: "pending" });

    const result = await confirm.confirmPaymentById({ ...base, amount: 100_000 });
    assert.deepEqual(result, { ok: false, reason: "expired" });
    assert.equal(auditCalls.length, 0, "must not write an audit log when locked");
  });

  test("confirms a pending payment and logs payment.confirm", async () => {
    withPayment({ id: "p1", amount: 100_000, status: "pending" });

    const result = await confirm.confirmPaymentById({ ...base, amount: 100_000 });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.payment.status, "confirmed");
    assert.deepEqual(
      auditCalls.map((c) => c.action),
      ["payment.confirm"],
    );
  });

  test("records payment.edit_amount_and_confirm when the amount changes", async () => {
    withPayment({ id: "p1", amount: 100_000, status: "pending" });

    const result = await confirm.confirmPaymentById({ ...base, amount: 120_000 });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.payment.amount, 120_000);
    assert.deepEqual(
      auditCalls.map((c) => c.action),
      ["payment.edit_amount_and_confirm"],
    );
  });
});

describe("rejectPaymentById", () => {
  test("returns null when the payment is missing", async () => {
    withPayment(null);
    const result = await confirm.rejectPaymentById({
      actorUserId: "admin-1",
      arisanId: "a1",
      paymentId: "p1",
    });
    assert.equal(result, null);
  });

  test("rejects a payment and logs payment.reject", async () => {
    withPayment({ id: "p1", amount: 100_000, status: "pending" });
    const result = await confirm.rejectPaymentById({
      actorUserId: "admin-1",
      arisanId: "a1",
      paymentId: "p1",
    });
    assert.equal(result?.status, "rejected");
    assert.deepEqual(
      auditCalls.map((c) => c.action),
      ["payment.reject"],
    );
  });
});

describe("getPendingPaymentsForArisan", () => {
  test("returns only pending and duplicate_check proofs", async () => {
    respond = ({ op, table }) => {
      if (op === "select" && table === schema.payments) {
        return [
          { id: "p1", amount: 100, createdAt: new Date(), memberName: "Andi", periodName: "Juni", status: "pending" },
          { id: "p2", amount: 100, createdAt: new Date(), memberName: "Budi", periodName: "Juni", status: "duplicate_check" },
          { id: "p3", amount: 100, createdAt: new Date(), memberName: "Cici", periodName: "Juni", status: "confirmed" },
          { id: "p4", amount: 100, createdAt: new Date(), memberName: "Dedi", periodName: "Juni", status: "rejected" },
        ];
      }
      return undefined;
    };

    const pending = await confirm.getPendingPaymentsForArisan("a1");
    assert.deepEqual(
      pending.map((p) => p.id).sort(),
      ["p1", "p2"],
    );
  });
});
