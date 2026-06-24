import assert from "node:assert/strict";
import { before, beforeEach, describe, mock, test } from "node:test";

import {
  createFakeDb,
  type FakeDbContext,
  type FakeDbResponder,
} from "@/lib/testing/fake-db";
import { fakeRedirect } from "@/lib/testing/next-mocks";

// resolveArisanContext (PRD WhatsApp-first parity): when a user belongs to more
// than one arisan, context commands must let them pick a group over WhatsApp
// instead of bouncing to the dashboard. The sticky "active arisan" is reused
// when it is still an eligible candidate; otherwise a numbered selection flow
// is started (a pending "select_arisan" action written to users).

let respond: FakeDbResponder = () => undefined;
const updates: Array<{ table: unknown; set: Record<string, unknown> }> = [];
const { db } = createFakeDb((ctx: FakeDbContext) => {
  if (ctx.op === "update") {
    updates.push({
      set: (ctx.args.set?.[0] as Record<string, unknown>) ?? {},
      table: ctx.table,
    });
  }
  return respond(ctx);
});

type Tables = typeof import("@/db/schema");
let schema: Tables;
let mod: typeof import("@/lib/whatsapp/active-arisan");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("next/navigation", { namedExports: { redirect: fakeRedirect } });
  schema = await import("@/db/schema");
  mod = await import("@/lib/whatsapp/active-arisan");
});

beforeEach(() => {
  respond = () => undefined;
  updates.length = 0;
});

function withActiveArisanId(activeArisanId: string | null) {
  respond = ({ op, table }) =>
    op === "select" && table === schema.users
      ? [{ activeArisanId }]
      : undefined;
}

function membership(arisanGroupId: string, role: "admin" | "member") {
  return {
    arisanGroupId,
    arisanName: `Arisan ${arisanGroupId}`,
    displayName: "Anggota",
    id: `m-${arisanGroupId}`,
    role,
  };
}

function pendingUpdate() {
  return updates.find((u) => u.table === schema.users && u.set.pendingAction);
}

describe("resolveArisanContext", () => {
  test("no membership at all -> join guidance, no prompt", async () => {
    const result = await mod.resolveArisanContext({
      command: { name: "status" },
      memberships: [],
      scope: "any",
      userId: "u1",
    });

    assert.equal(result.kind, "none");
    assert.match(result.kind === "none" ? result.reply : "", /JOIN/);
    assert.equal(pendingUpdate(), undefined);
  });

  test("admin scope with only member rows -> admin-only message", async () => {
    const result = await mod.resolveArisanContext({
      command: { name: "rekap" },
      memberships: [membership("g1", "member")],
      scope: "admin",
      userId: "u1",
    });

    assert.equal(result.kind, "none");
    assert.match(result.kind === "none" ? result.reply : "", /hanya untuk admin/);
  });

  test("exactly one candidate -> resolves directly", async () => {
    const result = await mod.resolveArisanContext({
      command: { name: "status" },
      memberships: [membership("g1", "member")],
      scope: "any",
      userId: "u1",
    });

    assert.equal(result.kind, "ok");
    assert.equal(result.kind === "ok" ? result.membership.arisanGroupId : "", "g1");
    assert.equal(pendingUpdate(), undefined, "single arisan must not prompt");
  });

  test("admin scope filters to admin rows when picking the lone candidate", async () => {
    const result = await mod.resolveArisanContext({
      command: { name: "konfirmasi" },
      memberships: [membership("g1", "member"), membership("g2", "admin")],
      scope: "admin",
      userId: "u1",
    });

    assert.equal(result.kind, "ok");
    assert.equal(result.kind === "ok" ? result.membership.arisanGroupId : "", "g2");
  });

  test("many candidates with a matching active arisan -> uses it, no prompt", async () => {
    withActiveArisanId("g2");

    const result = await mod.resolveArisanContext({
      command: { name: "status" },
      memberships: [membership("g1", "member"), membership("g2", "member")],
      scope: "any",
      userId: "u1",
    });

    assert.equal(result.kind, "ok");
    assert.equal(result.kind === "ok" ? result.membership.arisanGroupId : "", "g2");
    assert.equal(pendingUpdate(), undefined);
  });

  test("many candidates, active not eligible -> starts numbered selection", async () => {
    withActiveArisanId(null);

    const result = await mod.resolveArisanContext({
      command: { name: "status" },
      memberships: [membership("g1", "member"), membership("g2", "member")],
      scope: "any",
      userId: "u1",
    });

    assert.equal(result.kind, "prompt");
    assert.match(result.kind === "prompt" ? result.reply : "", /1\. Arisan g1/);
    assert.match(result.kind === "prompt" ? result.reply : "", /2\. Arisan g2/);

    const update = pendingUpdate();
    assert.ok(update, "a select_arisan pending action must be stored");
    assert.equal(update?.set.pendingAction, "select_arisan");

    const data = update?.set.pendingActionData as {
      command: { name: string };
      candidates: { arisanGroupId: string }[];
    };
    assert.equal(data.command.name, "status");
    assert.equal(data.candidates.length, 2);
  });

  test("admin scope only offers admin arisan in the selection prompt", async () => {
    withActiveArisanId(null);

    const result = await mod.resolveArisanContext({
      command: { name: "rekap" },
      memberships: [
        membership("g1", "admin"),
        membership("g2", "member"),
        membership("g3", "admin"),
      ],
      scope: "admin",
      userId: "u1",
    });

    assert.equal(result.kind, "prompt");
    const data = pendingUpdate()?.set.pendingActionData as {
      candidates: { arisanGroupId: string }[];
    };
    assert.deepEqual(
      data.candidates.map((c) => c.arisanGroupId),
      ["g1", "g3"],
    );
  });
});

describe("buildSelectPrompt", () => {
  test("numbers each arisan and labels the role in Indonesian", () => {
    const text = mod.buildSelectPrompt([
      { arisanGroupId: "g1", arisanName: "RT1", role: "admin" },
      { arisanGroupId: "g2", arisanName: "RT2", role: "member" },
    ]);

    assert.match(text, /1\. RT1 \(admin\)/);
    assert.match(text, /2\. RT2 \(anggota\)/);
  });
});
