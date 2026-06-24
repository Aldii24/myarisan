import assert from "node:assert/strict";
import { before, beforeEach, describe, mock, test } from "node:test";

import {
  createFakeDb,
  type FakeDbContext,
  type FakeDbResponder,
} from "@/lib/testing/fake-db";
import { fakeRedirect } from "@/lib/testing/next-mocks";

// handleSelectArisanInput: the reply step of the multi-arisan selection flow.
// A valid number sets the sticky active arisan and re-runs the original command;
// BATAL cancels; anything else re-prompts. handleWhatsAppCommand is mocked so
// this test stays focused on the selection plumbing.

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

const dispatch = mock.fn(
  async (_input: { command: { name: string }; userId: string }) =>
    "REPLY_FOR_COMMAND",
);

type Tables = typeof import("@/db/schema");
let schema: Tables;
let mod: typeof import("@/lib/whatsapp/handle-select-arisan");

// These cases all re-run text-returning commands, so the reply must be a string
// (the image-reply branch is for paket bills). Narrow it for the assertions.
function expectText(
  reply: Awaited<ReturnType<typeof mod.handleSelectArisanInput>>,
): string {
  assert.equal(typeof reply, "string", "expected a text reply");
  return reply as string;
}

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("next/navigation", { namedExports: { redirect: fakeRedirect } });
  mock.module("@/lib/whatsapp/handle-command", {
    namedExports: { handleWhatsAppCommand: dispatch },
  });
  schema = await import("@/db/schema");
  mod = await import("@/lib/whatsapp/handle-select-arisan");
});

beforeEach(() => {
  respond = () => undefined;
  updates.length = 0;
  dispatch.mock.resetCalls();
  dispatch.mock.mockImplementation(async () => "REPLY_FOR_COMMAND");
});

const state = {
  action: "select_arisan" as const,
  data: {
    candidates: [
      { arisanGroupId: "g1", arisanName: "RT1", role: "admin" },
      { arisanGroupId: "g2", arisanName: "RT2", role: "member" },
    ],
    command: { name: "status" },
  },
};

function activeArisanUpdate() {
  return updates.find(
    (u) => u.table === schema.users && "activeArisanId" in u.set,
  );
}

describe("handleSelectArisanInput", () => {
  test("valid number sets active arisan and re-runs the command", async () => {
    const reply = expectText(await mod.handleSelectArisanInput("u1", "2", state));

    assert.equal(activeArisanUpdate()?.set.activeArisanId, "g2");
    assert.equal(dispatch.mock.callCount(), 1);
    assert.deepEqual(dispatch.mock.calls[0].arguments[0], {
      command: { name: "status" },
      userId: "u1",
    });
    assert.match(reply, /^✅ \*Arisan aktif: RT2\*/);
    assert.match(reply, /REPLY_FOR_COMMAND/);
  });

  test("does not double-print the active arisan for menu replies", async () => {
    dispatch.mock.mockImplementation(async () => "Arisan aktif: RT1 (admin)\n...");

    const reply = expectText(await mod.handleSelectArisanInput("u1", "1", state));

    assert.equal(reply.match(/Arisan aktif/g)?.length, 1);
  });

  test("out-of-range number re-prompts and does not run a command", async () => {
    const reply = expectText(await mod.handleSelectArisanInput("u1", "9", state));

    assert.equal(dispatch.mock.callCount(), 0);
    assert.equal(activeArisanUpdate(), undefined);
    assert.match(reply, /nomor 1 sampai 2/);
  });

  test("BATAL cancels the flow", async () => {
    const reply = expectText(await mod.handleSelectArisanInput("u1", "batal", state));

    assert.equal(dispatch.mock.callCount(), 0);
    assert.match(reply, /Dibatalkan/);
  });
});
