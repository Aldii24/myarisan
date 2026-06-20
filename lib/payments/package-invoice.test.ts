import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Manual-QRIS package invoice core, shared by the dashboard Paket actions and
// the WhatsApp `paket` flow. @/db is faked; audit, storage, and the plan lookup
// are stubbed so these tests isolate the invoice-create / proof-attach guard
// logic.

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

type FakePlan = { id: string; name: string; price: number } | null;
let plan: FakePlan = { id: "pro", name: "Pro", price: 50000 };
let validationError: string | null = null;

let pkg: typeof import("@/lib/payments/package-invoice");
let schema: typeof import("@/db/schema");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("@/lib/audit", {
    namedExports: { createAuditLog: async () => {} },
  });
  mock.module("@/lib/storage", {
    namedExports: {
      saveInvoiceProofFile: async () => ({
        hash: "hash-1",
        publicPath: "/uploads/package-payments/proof.jpg",
      }),
      validatePaymentProofFile: () => validationError,
    },
  });
  mock.module("@/lib/subscription", {
    namedExports: { getPlanById: async () => plan },
  });
  schema = await import("@/db/schema");
  pkg = await import("@/lib/payments/package-invoice");
});

afterEach(() => {
  respond = () => undefined;
  plan = { id: "pro", name: "Pro", price: 50000 };
  validationError = null;
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

const baseCreateInput = {
  actorUserId: "admin-1",
  arisanId: "arisan-1",
  planId: "pro",
};

const fakeFile = new File(["x"], "proof.jpg", { type: "image/jpeg" });

describe("createPackageInvoice", () => {
  test("rejects the free plan without writing an invoice", async () => {
    plan = { id: "free", name: "Free", price: 0 };
    let wrote = false;
    setDb((ctx) => {
      if (ctx.op === "insert") {
        wrote = true;
      }
      return undefined;
    });

    const result = await pkg.createPackageInvoice(baseCreateInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "invalid_plan");
    assert.equal(wrote, false);
  });

  test("rejects an unknown plan", async () => {
    plan = null;

    const result = await pkg.createPackageInvoice(baseCreateInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "invalid_plan");
  });

  test("creates a pending invoice for a paid plan", async () => {
    let inserted = false;
    setDb((ctx) => {
      if (ctx.op === "insert" && ctx.table === schema.invoices) {
        inserted = true;
        return [
          { amount: 50000, id: "invoice-1", planId: "pro", status: "pending" },
        ];
      }
      return undefined;
    });

    const result = await pkg.createPackageInvoice(baseCreateInput);

    assert.equal(result.ok, true);
    assert.equal(inserted, true);
    assert.equal(result.ok === true && result.invoiceId, "invoice-1");
    assert.equal(result.ok === true && result.amount, 50000);
    assert.equal(result.ok === true && result.planName, "Pro");
  });
});

describe("attachInvoiceProof", () => {
  const baseProofInput = {
    actorUserId: "admin-1",
    arisanId: "arisan-1",
    file: fakeFile,
    invoiceId: "invoice-1",
  };

  test("rejects an invalid file before any db read", async () => {
    validationError = "Format bukti harus JPG, PNG, atau WebP.";
    let read = false;
    setDb((ctx) => {
      if (ctx.op === "select") {
        read = true;
      }
      return undefined;
    });

    const result = await pkg.attachInvoiceProof(baseProofInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "invalid_file");
    assert.equal(read, false);
  });

  test("fails when the invoice is not found", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.invoices ? [] : undefined,
    );

    const result = await pkg.attachInvoiceProof(baseProofInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "not_found");
  });

  test("refuses an already-paid invoice without saving the file", async () => {
    let updated = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.invoices) {
        return [{ id: "invoice-1", status: "paid" }];
      }
      if (ctx.op === "update") {
        updated = true;
      }
      return undefined;
    });

    const result = await pkg.attachInvoiceProof(baseProofInput);

    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "already_paid");
    assert.equal(updated, false);
  });

  test("attaches the proof and moves the invoice to pending_verification", async () => {
    let updated = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.invoices) {
        return [{ id: "invoice-1", proofImageUrl: null, status: "pending" }];
      }
      if (ctx.op === "update" && ctx.table === schema.invoices) {
        updated = true;
        return [
          {
            id: "invoice-1",
            proofImageUrl: "/uploads/package-payments/proof.jpg",
            status: "pending_verification",
          },
        ];
      }
      return undefined;
    });

    const result = await pkg.attachInvoiceProof(baseProofInput);

    assert.equal(result.ok, true);
    assert.equal(updated, true);
    assert.equal(result.ok === true && result.status, "pending_verification");
  });
});

describe("getOpenPackageInvoice", () => {
  test("returns a pending invoice", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.invoices
        ? [{ amount: 50000, id: "invoice-1", planId: "pro", status: "pending" }]
        : undefined,
    );

    const result = await pkg.getOpenPackageInvoice("arisan-1");

    assert.equal(result?.id, "invoice-1");
  });

  test("returns null when the latest invoice is already paid", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.invoices
        ? [{ amount: 50000, id: "invoice-1", planId: "pro", status: "paid" }]
        : undefined,
    );

    const result = await pkg.getOpenPackageInvoice("arisan-1");

    assert.equal(result, null);
  });

  test("returns null when there are no invoices", async () => {
    setDb(() => []);

    const result = await pkg.getOpenPackageInvoice("arisan-1");

    assert.equal(result, null);
  });
});
