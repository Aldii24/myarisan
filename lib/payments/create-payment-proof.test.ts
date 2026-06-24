import assert from "node:assert/strict";
import { before, beforeEach, describe, mock, test } from "node:test";

import {
  createFakeDb,
  type FakeDbContext,
  type FakeDbResponder,
} from "@/lib/testing/fake-db";

// Payment-proof submission must register the payment and respond fast; the heavy
// OCR + AI reading is deferred to a background `after()` step so a slow/failing
// read can never time out the request (the production 504 bug). These tests pin
// that split: createPaymentProofFromUpload persists synchronously WITHOUT running
// OCR/AI, and enrichPaymentProof does the reading and respects a concurrent admin
// decision. @/db and every heavy dependency are mocked.

let respond: FakeDbResponder = () => undefined;
const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const updates: Array<{ table: unknown; set: Record<string, unknown> }> = [];
const { db } = createFakeDb((ctx: FakeDbContext) => {
  if (ctx.op === "insert") {
    inserts.push({
      table: ctx.table,
      values: (ctx.args.values?.[0] as Record<string, unknown>) ?? {},
    });
  }
  if (ctx.op === "update") {
    updates.push({
      set: (ctx.args.set?.[0] as Record<string, unknown>) ?? {},
      table: ctx.table,
    });
  }
  return respond(ctx);
});

const fallbackAi = {
  confidence: 0,
  detectedAmount: null as number | null,
  detectedBankOrWallet: null as string | null,
  detectedDate: null as string | null,
  detectedReferenceNo: null as string | null,
  detectedSenderName: null as string | null,
  matchedMemberName: null as string | null,
  matchedPeriod: null as string | null,
  notes: "",
  warnings: [] as string[],
};

const afterCallbacks: Array<() => unknown> = [];
const ocrMock = mock.fn(async () => "");
const aiMock = mock.fn(async () => fallbackAi);
let gate: { allowed: boolean; reason?: string } = { allowed: true };
let duplicate: { paymentId: string; reasons: string[] } | null = null;

type Tables = typeof import("@/db/schema");
let schema: Tables;
let mod: typeof import("@/lib/payments/create-payment-proof");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
  mock.module("next/server", {
    namedExports: {
      after: (cb: () => unknown) => {
        afterCallbacks.push(cb);
      },
    },
  });
  mock.module("@/lib/subscription", {
    namedExports: {
      canUseAutomaticProof: async () => gate,
      incrementProofUsage: async () => {},
    },
  });
  mock.module("@/lib/storage", {
    namedExports: {
      savePaymentProofFile: async () => ({
        hash: "HASH",
        publicPath: "payment-proofs/x.jpg",
      }),
      validatePaymentProofFile: () => null,
    },
  });
  mock.module("@/lib/arisan", {
    namedExports: { isPaidStatus: (status: string) => status === "confirmed" },
  });
  mock.module("@/lib/payments/detect-duplicate", {
    namedExports: { findDuplicatePayment: async () => duplicate },
  });
  mock.module("@/lib/ocr", { namedExports: { extractTextFromImage: ocrMock } });
  mock.module("@/lib/ai/payment-proof-parser", {
    namedExports: { parsePaymentProofWithAI: aiMock },
  });

  schema = await import("@/db/schema");
  mod = await import("@/lib/payments/create-payment-proof");
});

beforeEach(() => {
  inserts.length = 0;
  updates.length = 0;
  afterCallbacks.length = 0;
  gate = { allowed: true };
  duplicate = null;
  ocrMock.mock.resetCalls();
  aiMock.mock.resetCalls();
  ocrMock.mock.mockImplementation(async () => "");
  aiMock.mock.mockImplementation(async () => fallbackAi);
  happyPath();
});

// Default reads for a brand-new submission: member exists, group + active period
// exist, no prior payment for the period. Inserts echo a fresh payment id.
function happyPath() {
  respond = ({ op, table }) => {
    if (op === "insert" && table === schema.payments) {
      return [{ id: "pay-1" }];
    }
    if (op === "update" && table === schema.payments) {
      return [{ id: "pay-1" }];
    }
    if (op === "select" && table === schema.memberships) {
      return [{ displayName: "Sinta" }];
    }
    if (op === "select" && table === schema.arisanGroups) {
      return [{ adminUserId: "admin-1", amountPerPeriod: 100_000, name: "Arisan RT1" }];
    }
    if (op === "select" && table === schema.periods) {
      return [{ id: "per-1", name: "Juni 2026" }];
    }
    if (op === "select" && table === schema.payments) {
      return [];
    }
    return undefined;
  };
}

function makeFile() {
  return new File([new Uint8Array([1, 2, 3])], "proof.jpg", {
    type: "image/jpeg",
  });
}

const baseInput = () => ({
  amount: 100_000,
  arisanId: "a1",
  file: makeFile(),
  userId: "u1",
});

function paymentInsert() {
  return inserts.find((row) => row.table === schema.payments);
}

describe("createPaymentProofFromUpload (fast path)", () => {
  test("persists a pending payment and defers OCR/AI to after()", async () => {
    const result = await mod.createPaymentProofFromUpload(baseInput());

    assert.equal(result.ok, true);
    assert.equal(result.ok && result.status, "pending");
    assert.equal(result.ok && result.detectedAmount, null);

    const insert = paymentInsert();
    assert.ok(insert, "a payment row must be inserted");
    assert.equal(insert?.values.status, "pending");
    assert.equal(insert?.values.ocrText, null);
    assert.equal(insert?.values.aiResultJson, null);

    // The whole point: no reading happens during the request.
    assert.equal(ocrMock.mock.callCount(), 0, "OCR must not run inline");
    assert.equal(aiMock.mock.callCount(), 0, "AI must not run inline");
    assert.equal(afterCallbacks.length, 1, "enrichment must be scheduled");
  });

  test("flags an exact image-hash duplicate synchronously", async () => {
    duplicate = { paymentId: "old-1", reasons: ["image"] };

    const result = await mod.createPaymentProofFromUpload(baseInput());

    assert.equal(result.ok && result.status, "duplicate_check");
    assert.equal(result.ok && result.isDuplicate, true);
    assert.equal(paymentInsert()?.values.status, "duplicate_check");
  });

  test("blocks when the automatic-proof quota is exhausted", async () => {
    gate = { allowed: false, reason: "quota" };

    const result = await mod.createPaymentProofFromUpload(baseInput());

    assert.equal(result.ok, false);
    assert.equal(paymentInsert(), undefined);
    assert.equal(afterCallbacks.length, 0);
  });
});

describe("enrichPaymentProof (background)", () => {
  const enrichInput = () => ({
    activePeriodName: "Juni 2026",
    arisanAmountPerPeriod: 100_000,
    arisanId: "a1",
    baseDuplicateWarnings: [],
    memberDisplayName: "Sinta",
    memberNames: ["Sinta"],
    memberUserId: "u1",
    note: null,
    paymentId: "pay-1",
    periodId: "per-1",
    proofBytes: Buffer.from([1, 2, 3]),
    submittedAmount: 100_000,
  });

  test("reads the proof and writes ocr/ai back to a pending payment", async () => {
    respond = ({ op, table }) => {
      if (op === "select" && table === schema.payments) {
        return [{ proofImageHash: "HASH", status: "pending" }];
      }
      if (op === "update" && table === schema.payments) {
        return [{ id: "pay-1" }];
      }
      return undefined;
    };
    ocrMock.mock.mockImplementation(async () => "OCR TEXT");
    aiMock.mock.mockImplementation(async () => ({
      ...fallbackAi,
      detectedAmount: 100_000,
    }));

    await mod.enrichPaymentProof(enrichInput());

    assert.equal(ocrMock.mock.callCount(), 1);
    assert.equal(aiMock.mock.callCount(), 1);

    const update = updates.find((row) => row.table === schema.payments);
    assert.ok(update, "the payment must be updated");
    assert.equal(update?.set.ocrText, "OCR TEXT");
    assert.equal(update?.set.status, "pending");
    assert.ok(update?.set.aiResultJson, "ai result must be stored");
  });

  test("upgrades status to duplicate_check when the AI check finds a match", async () => {
    respond = ({ op, table }) =>
      op === "select" && table === schema.payments
        ? [{ proofImageHash: "HASH", status: "pending" }]
        : op === "update" && table === schema.payments
          ? [{ id: "pay-1" }]
          : undefined;
    duplicate = { paymentId: "old-1", reasons: ["reference"] };

    await mod.enrichPaymentProof(enrichInput());

    const update = updates.find((row) => row.table === schema.payments);
    assert.equal(update?.set.status, "duplicate_check");
    assert.equal(update?.set.duplicateOfPaymentId, "old-1");
  });

  test("bails without reading when the admin already acted", async () => {
    respond = ({ op, table }) =>
      op === "select" && table === schema.payments
        ? [{ proofImageHash: "HASH", status: "confirmed" }]
        : undefined;

    await mod.enrichPaymentProof(enrichInput());

    assert.equal(ocrMock.mock.callCount(), 0, "must not read a settled payment");
    assert.equal(
      updates.find((row) => row.table === schema.payments),
      undefined,
      "must not overwrite a settled payment",
    );
  });
});
