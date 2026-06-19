import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";

// Giliran mutations (turn ordering + draw winner), shared by the dashboard and
// the WhatsApp `giliran` flow. @/db is mocked ONCE and the real logic runs
// against a table-aware fake whose behaviour is swapped per test.

let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

type GiliranModule = typeof import("@/lib/giliran");
type Tables = typeof import("@/db/schema");

let giliran: GiliranModule;
let schema: Tables;

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  schema = await import("@/db/schema");
  giliran = await import("@/lib/giliran");
});

afterEach(() => {
  respond = () => undefined;
});

function setDb(next: FakeDbResponder) {
  respond = next;
}

const memberRows = [
  { displayName: "Sinta", id: "m1", turnOrder: 1 },
  { displayName: "Rina", id: "m2", turnOrder: 2 },
  { displayName: "Dewi", id: "m3", turnOrder: 3 },
];

describe("reorderGiliranMember", () => {
  test("moves a member and persists the new order", async () => {
    let updateCount = 0;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return memberRows;
      }
      if (ctx.op === "update" && ctx.table === schema.memberships) {
        updateCount += 1;
        return undefined;
      }
      return undefined;
    });

    const result = await giliran.reorderGiliranMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      direction: "up",
      membershipId: "m2",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(updateCount, memberRows.length, "every member's order persisted");
  });

  test("rejects moving the first member further up", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships
        ? memberRows
        : undefined,
    );

    const result = await giliran.reorderGiliranMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      direction: "up",
      membershipId: "m1",
    });

    assert.deepEqual(result, {
      error: "Urutan sudah di posisi paling ujung.",
      ok: false,
    });
  });

  test("rejects an unknown member", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships
        ? memberRows
        : undefined,
    );

    const result = await giliran.reorderGiliranMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      direction: "down",
      membershipId: "ghost",
    });

    assert.deepEqual(result, { error: "Anggota tidak ditemukan.", ok: false });
  });
});

describe("randomizeGiliranOrder", () => {
  test("needs at least two members", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.memberships
        ? [memberRows[0]]
        : undefined,
    );

    const result = await giliran.randomizeGiliranOrder({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
    });

    assert.deepEqual(result, {
      error: "Minimal 2 anggota untuk mengacak giliran.",
      ok: false,
    });
  });

  test("shuffles and persists when there are enough members", async () => {
    let updateCount = 0;
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return memberRows;
      }
      if (ctx.op === "update" && ctx.table === schema.memberships) {
        updateCount += 1;
        return undefined;
      }
      return undefined;
    });

    const result = await giliran.randomizeGiliranOrder({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(updateCount, memberRows.length);
  });
});

describe("setGiliranDrawMember", () => {
  test("requires an active period", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.periods ? [] : undefined,
    );

    const result = await giliran.setGiliranDrawMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "m1",
    });

    assert.deepEqual(result, {
      error: "Belum ada periode aktif untuk diatur gilirannya.",
      ok: false,
    });
  });

  test("rejects a member not in the arisan", async () => {
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.periods) {
        return [{ drawMemberId: null, id: "p1" }];
      }
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return [];
      }
      return undefined;
    });

    const result = await giliran.setGiliranDrawMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "ghost",
    });

    assert.deepEqual(result, {
      error: "Anggota tidak ditemukan di arisan ini.",
      ok: false,
    });
  });

  test("sets a valid draw member", async () => {
    setDb((ctx) => {
      if (ctx.op === "select" && ctx.table === schema.periods) {
        return [{ drawMemberId: null, id: "p1" }];
      }
      if (ctx.op === "select" && ctx.table === schema.memberships) {
        return [{ id: "m2" }];
      }
      return undefined;
    });

    const result = await giliran.setGiliranDrawMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: "m2",
    });

    assert.deepEqual(result, { cleared: false, ok: true });
  });

  test("clears the draw member without a member lookup", async () => {
    setDb((ctx) =>
      ctx.op === "select" && ctx.table === schema.periods
        ? [{ drawMemberId: "m1", id: "p1" }]
        : undefined,
    );

    const result = await giliran.setGiliranDrawMember({
      actorUserId: "admin-1",
      arisanId: "arisan-1",
      membershipId: null,
    });

    assert.deepEqual(result, { cleared: true, ok: true });
  });
});
