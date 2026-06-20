import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";
import { fakeRedirect } from "@/lib/testing/next-mocks";

// Owner invoice-decision core (PRD §13), shared by the owner dashboard actions
// and the WhatsApp owner flow. @/db is faked; audit is stubbed. Tests isolate
// the not-found / already-paid guards and the activate-vs-extend subscription
// branch. OWNER_PHONE is set so isOwnerUserId can be exercised too.

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

let owner: typeof import("@/lib/owner");
let schema: typeof import("@/db/schema");

before(async () => {
  process.env.OWNER_PHONE = "081200000000";
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("next/navigation", { namedExports: { redirect: fakeRedirect } });
  mock.module("@/lib/audit", {
    namedExports: { createAuditLog: async () => {} },
  });
  schema = await import("@/db/schema");
  owner = await import("@/lib/owner");
});

afterEach(() => {
  respond = () => undefined;
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

const invoiceRow = {
  invoice: {
    adminUserId: "admin-1",
    amount: 50000,
    arisanGroupId: "arisan-1",
    id: "invoice-1",
    planId: "pro",
    status: "pending_verification",
  },
  arisanName: "Arisan Keluarga",
  planName: "Pro",
};

const baseApprove = { invoiceId: "invoice-1", ownerUserId: "owner-1" };

describe("approvePackageInvoice", () => {
  test("fails when the invoice does not exist", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.invoices ? [] : undefined,
    );

    const result = await owner.approvePackageInvoice(baseApprove);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "not_found");
  });

  test("refuses an already-paid invoice without writing", async () => {
    let wrote = false;
    setDb((ctx) => {
      if (ctx.op === "update" || ctx.op === "insert") {
        wrote = true;
      }
      if (ctx.op === "select" && ctx.table === schema.invoices) {
        return [{ ...invoiceRow, invoice: { ...invoiceRow.invoice, status: "paid" } }];
      }
      return undefined;
    });

    const result = await owner.approvePackageInvoice(baseApprove);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "already_paid");
    assert.equal(wrote, false);
  });

  test("activates a new subscription when none exists", async () => {
    let subscriptionWritten = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.invoices) {
        return [invoiceRow];
      }
      if (ctx.op === "select" && ctx.table === schema.subscriptions) {
        return [];
      }
      if (ctx.op === "update" && ctx.table === schema.invoices) {
        return [{ paidAt: new Date(), status: "paid" }];
      }
      if (ctx.op === "insert" && ctx.table === schema.subscriptions) {
        subscriptionWritten = true;
      }
      if (ctx.op === "select" && ctx.table === schema.plans) {
        return [{ monthlyProofLimit: 150 }];
      }
      return undefined;
    });

    const result = await owner.approvePackageInvoice(baseApprove);

    assert.equal(result.ok, true);
    assert.equal(subscriptionWritten, true);
    assert.equal(result.ok === true && result.extended, false);
    assert.equal(result.ok === true && result.arisanName, "Arisan Keluarga");
    assert.equal(result.ok === true && result.planName, "Pro");
  });

  test("extends from the current period end for an active subscription", async () => {
    const currentEnd = new Date("2026-07-01T00:00:00.000Z");
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.invoices) {
        return [invoiceRow];
      }
      if (ctx.op === "select" && ctx.table === schema.subscriptions) {
        return [
          {
            currentPeriodEnd: currentEnd,
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            planId: "pro",
            status: "active",
          },
        ];
      }
      if (ctx.op === "update" && ctx.table === schema.invoices) {
        return [{ paidAt: new Date(), status: "paid" }];
      }
      if (ctx.op === "select" && ctx.table === schema.plans) {
        return [{ monthlyProofLimit: 150 }];
      }
      return undefined;
    });

    const result = await owner.approvePackageInvoice(baseApprove);

    assert.equal(result.ok, true);
    assert.equal(result.ok === true && result.extended, true);
    // 30 days past the existing end, not past now.
    assert.equal(
      result.ok === true && result.currentPeriodEnd.toISOString(),
      "2026-07-31T00:00:00.000Z",
    );
  });

  test("treats a lost update race as already paid", async () => {
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.invoices) {
        return [invoiceRow];
      }
      if (ctx.op === "select" && ctx.table === schema.subscriptions) {
        return [];
      }
      if (ctx.op === "update" && ctx.table === schema.invoices) {
        return [];
      }
      return undefined;
    });

    const result = await owner.approvePackageInvoice(baseApprove);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "already_paid");
  });
});

describe("rejectPackageInvoice", () => {
  test("fails when the invoice does not exist", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.invoices ? [] : undefined,
    );

    const result = await owner.rejectPackageInvoice(baseApprove);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "not_found");
  });

  test("rejects a pending_verification invoice", async () => {
    let rejected = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.invoices) {
        return [invoiceRow];
      }
      if (ctx.op === "update" && ctx.table === schema.invoices) {
        rejected = true;
        return [{ status: "rejected" }];
      }
      return undefined;
    });

    const result = await owner.rejectPackageInvoice({
      ...baseApprove,
      reason: "Bukti tidak jelas.",
    });

    assert.equal(result.ok, true);
    assert.equal(rejected, true);
    assert.equal(result.ok === true && result.adminUserId, "admin-1");
  });
});

describe("isOwnerUserId", () => {
  test("returns true for the configured owner phone", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.users
        ? [{ phone: "081200000000" }]
        : undefined,
    );

    assert.equal(await owner.isOwnerUserId("owner-1"), true);
  });

  test("returns false for a non-owner phone", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.users
        ? [{ phone: "081299999999" }]
        : undefined,
    );

    assert.equal(await owner.isOwnerUserId("user-2"), false);
  });
});
