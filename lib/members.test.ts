import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Member management core (add / rename / remove), shared by the dashboard and
// the WhatsApp `anggota` flow. @/db is faked; the subscription gate and audit
// writer are stubbed so these tests isolate the member resolution logic.

type GateResult = {
  allowed: boolean;
  currentMemberCount: number;
  limit: number;
  planName: string;
};

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

let gateResult: GateResult = {
  allowed: true,
  currentMemberCount: 0,
  limit: 15,
  planName: "Basic",
};

let membersModule: typeof import("@/lib/members");
let schema: typeof import("@/db/schema");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("@/lib/subscription", {
    namedExports: { canAddMember: async () => gateResult },
  });
  mock.module("@/lib/audit", {
    namedExports: { createAuditLog: async () => {} },
  });
  schema = await import("@/db/schema");
  membersModule = await import("@/lib/members");
});

afterEach(() => {
  respond = () => undefined;
  gateResult = { allowed: true, currentMemberCount: 0, limit: 15, planName: "Basic" };
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

describe("parseMemberNames", () => {
  test("trims, drops blanks, and de-duplicates case-insensitively", () => {
    const result = membersModule.parseMemberNames("Sinta\n  Rina \n\nsinta\nDewi");
    assert.deepEqual(result, ["Sinta", "Rina", "Dewi"]);
  });
});

describe("addMembersByNames", () => {
  test("rejects an empty list", async () => {
    const result = await membersModule.addMembersByNames({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      names: [],
    });
    assert.deepEqual(result, { error: "Tulis minimal 1 nama anggota.", ok: false });
  });

  test("rejects a name that already exists", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships
        ? [{ displayName: "Sinta", id: "m1", joinStatus: "invited", userId: null }]
        : undefined,
    );

    const result = await membersModule.addMembersByNames({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      names: ["Sinta"],
    });

    assert.deepEqual(result, { error: "Nama sudah ada: Sinta.", ok: false });
  });

  test("blocks when the plan member limit is reached", async () => {
    gateResult = {
      allowed: false,
      currentMemberCount: 5,
      limit: 5,
      planName: "Free",
    };
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships ? [] : undefined,
    );

    const result = await membersModule.addMembersByNames({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      names: ["Sinta", "Rina"],
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /maksimal 5 anggota/);
    }
  });

  test("inserts new names", async () => {
    let inserted = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return [];
      }
      if (ctx.op === "insert" && ctx.table === schema.memberships) {
        inserted = true;
        return undefined;
      }
      return undefined;
    });

    const result = await membersModule.addMembersByNames({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      names: ["Sinta", "Rina"],
    });

    assert.deepEqual(result, { addedCount: 2, ok: true });
    assert.equal(inserted, true);
  });

  test("reactivates a previously removed member instead of inserting", async () => {
    let updated = false;
    let inserted = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return [{ displayName: "Dewi", id: "mR", joinStatus: "removed", userId: null }];
      }
      if (ctx.op === "update" && ctx.table === schema.memberships) {
        updated = true;
        return undefined;
      }
      if (ctx.op === "insert" && ctx.table === schema.memberships) {
        inserted = true;
        return undefined;
      }
      return undefined;
    });

    const result = await membersModule.addMembersByNames({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      names: ["Dewi"],
    });

    assert.deepEqual(result, { addedCount: 1, ok: true });
    assert.equal(updated, true, "removed member reactivated");
    assert.equal(inserted, false, "no duplicate insert");
  });
});

describe("renameMember", () => {
  test("rejects an empty name", async () => {
    const result = await membersModule.renameMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "m1",
      newName: "   ",
    });
    assert.deepEqual(result, {
      error: "Nama anggota tidak boleh kosong.",
      ok: false,
    });
  });

  test("rejects a name already used by another member", async () => {
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        // getManageableMember uses limit(1); the dup-check select does not.
        if (ctx.chain.includes("limit")) {
          return [{ displayName: "Sinta", id: "m1", role: "member" }];
        }
        return [
          { displayName: "Sinta", id: "m1" },
          { displayName: "Rina", id: "m2" },
        ];
      }
      return undefined;
    });

    const result = await membersModule.renameMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "m1",
      newName: "Rina",
    });

    assert.deepEqual(result, {
      error: 'Nama "Rina" sudah dipakai di arisan ini.',
      ok: false,
    });
  });

  test("renames when the new name is free", async () => {
    let updated = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        if (ctx.chain.includes("limit")) {
          return [{ displayName: "Sinta", id: "m1", role: "member" }];
        }
        return [{ displayName: "Sinta", id: "m1" }];
      }
      if (ctx.op === "update" && ctx.table === schema.memberships) {
        updated = true;
        return undefined;
      }
      return undefined;
    });

    const result = await membersModule.renameMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "m1",
      newName: "Sinta Ayu",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(updated, true);
  });
});

describe("removeMember", () => {
  test("rejects an unknown member", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships ? [] : undefined,
    );

    const result = await membersModule.removeMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "ghost",
    });

    assert.deepEqual(result, { error: "Anggota tidak ditemukan.", ok: false });
  });

  test("refuses to remove the admin", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships
        ? [{ displayName: "Bu Admin", id: "a1", role: "admin" }]
        : undefined,
    );

    const result = await membersModule.removeMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "a1",
    });

    assert.deepEqual(result, {
      error: "Admin arisan tidak bisa dihapus.",
      ok: false,
    });
  });

  test("soft-removes a member", async () => {
    let updated = false;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return [{ displayName: "Rina", id: "m2", role: "member" }];
      }
      if (ctx.op === "update" && ctx.table === schema.memberships) {
        updated = true;
        return undefined;
      }
      return undefined;
    });

    const result = await membersModule.removeMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "m2",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(updated, true);
  });
});
