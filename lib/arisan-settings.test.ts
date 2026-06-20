import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Arisan settings edit core (name / amount / due day / bank account), shared by
// the dashboard form and the WhatsApp `pengaturan` flow. @/db is faked and the
// audit writer stubbed so these tests isolate validation + update logic.

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

let settings: typeof import("@/lib/arisan-settings");
let schema: typeof import("@/db/schema");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("@/lib/audit", {
    namedExports: { createAuditLog: async () => {} },
  });
  schema = await import("@/db/schema");
  settings = await import("@/lib/arisan-settings");
});

afterEach(() => {
  respond = () => undefined;
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

const groupRow = {
  amountPerPeriod: 100000,
  bankAccountText: "BCA - Siti - 123",
  dueDay: 10,
  name: "Arisan RT 03",
  periodType: "monthly",
};

describe("validateSettingField", () => {
  test("name must be at least 3 characters", () => {
    assert.deepEqual(settings.validateSettingField("name", "ab"), {
      error: "Nama arisan minimal 3 karakter.",
      ok: false,
    });
    assert.deepEqual(settings.validateSettingField("name", "  Arisan Baru "), {
      ok: true,
      value: "Arisan Baru",
    });
  });

  test("amount strips non-digits and must be positive", () => {
    assert.deepEqual(settings.validateSettingField("amountPerPeriod", "Rp150.000"), {
      ok: true,
      value: 150000,
    });
    assert.deepEqual(settings.validateSettingField("amountPerPeriod", "0"), {
      error: "Nominal setoran harus angka lebih dari 0.",
      ok: false,
    });
  });

  test("due day must be 1..28", () => {
    assert.deepEqual(settings.validateSettingField("dueDay", "10"), {
      ok: true,
      value: 10,
    });
    assert.deepEqual(settings.validateSettingField("dueDay", "31"), {
      error: "Batas setor harus angka 1 sampai 28.",
      ok: false,
    });
  });

  test("bank account cannot be empty", () => {
    assert.deepEqual(settings.validateSettingField("bankAccountText", "   "), {
      error: "Rekening admin tidak boleh kosong.",
      ok: false,
    });
  });
});

describe("updateArisanSettingField", () => {
  test("rejects invalid input without touching the db", async () => {
    let updated = false;
    setDb((ctx) => {
      if (ctx.op === "update") {
        updated = true;
      }
      return undefined;
    });

    const result = await settings.updateArisanSettingField({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      field: "dueDay",
      rawValue: "40",
    });

    assert.equal(result.ok, false);
    assert.equal(updated, false);
  });

  test("persists a valid single-field change", async () => {
    let updated = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.arisanGroups) {
        return [groupRow];
      }
      if (ctx.op === "update" && ctx.table === schema.arisanGroups) {
        updated = true;
        return undefined;
      }
      return undefined;
    });

    const result = await settings.updateArisanSettingField({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      field: "amountPerPeriod",
      rawValue: "200000",
    });

    assert.equal(result.ok, true);
    assert.equal(updated, true);
  });
});

describe("updateArisanSettings (full form)", () => {
  test("fails the whole update if any field is invalid", async () => {
    let updated = false;
    setDb((ctx) => {
      if (ctx.op === "update") {
        updated = true;
      }
      return undefined;
    });

    const result = await settings.updateArisanSettings({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      values: {
        amountPerPeriod: "100000",
        bankAccountText: "BCA - Siti - 123",
        dueDay: "99",
        name: "Arisan RT 03",
      },
    });

    assert.equal(result.ok, false);
    assert.equal(updated, false);
  });

  test("saves when all fields are valid", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.arisanGroups
        ? [groupRow]
        : undefined,
    );

    const result = await settings.updateArisanSettings({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      values: {
        amountPerPeriod: "120000",
        bankAccountText: "BCA - Siti - 123",
        dueDay: "15",
        name: "Arisan RT 03 Baru",
      },
    });

    assert.equal(result.ok, true);
  });
});
