import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbContext, type FakeDbResponder } from "@/lib/testing/fake-db";
import { fakeRedirect } from "@/lib/testing/next-mocks";

// WhatsApp send guard (tasks.md #15 / #17, PRD "WhatsApp Cost Guard"): NO
// outbound WhatsApp message may be sent outside the 24h service window. When
// skipped, the attempt is logged as skipped_outside_window and a dashboard
// notification is created. Only inside-window sends hit the Cloud API.
//
// @/db is mocked (real findUserForLogin/normalizePhone run against it) and
// global.fetch is mocked so no network call is ever made.

let respond: FakeDbResponder = () => undefined;
const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const { db } = createFakeDb((ctx: FakeDbContext) => {
  if (ctx.op === "insert") {
    inserts.push({ table: ctx.table, values: (ctx.args.values?.[0] as Record<string, unknown>) ?? {} });
  }
  return respond(ctx);
});

let fetchMock: ReturnType<typeof mock.fn>;
const realFetch = globalThis.fetch;

type Tables = typeof import("@/db/schema");
let schema: Tables;
let send: typeof import("@/lib/whatsapp/send-message");

before(async () => {
  mock.module("@/db", { namedExports: { db, schema: {} } });
  // send-message → @/lib/auth/user imports redirect from next/navigation, which
  // cannot load the real module under the test runtime; stub it.
  mock.module("next/navigation", { namedExports: { redirect: fakeRedirect } });
  schema = await import("@/db/schema");
  send = await import("@/lib/whatsapp/send-message");
});

beforeEach(() => {
  respond = () => undefined;
  inserts.length = 0;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  fetchMock = mock.fn(async () => okResponse());
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function okResponse() {
  return {
    json: async () => ({ messages: [{ id: "wamid.123" }] }),
    ok: true,
    status: 200,
  } as unknown as Response;
}

function errorResponse() {
  return {
    json: async () => ({ error: { message: "Recipient not in allowed list" } }),
    ok: false,
    status: 400,
  } as unknown as Response;
}

function withUser(user: Record<string, unknown> | null) {
  respond = ({ op, table }) =>
    op === "select" && table === schema.users ? (user ? [user] : []) : undefined;
}

function logsTo(table: unknown) {
  return inserts.filter((row) => row.table === table);
}

function configurePlatform() {
  process.env.WHATSAPP_ACCESS_TOKEN = "token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
}

describe("sendWhatsAppText input guard", () => {
  test("fails fast on an invalid phone number without calling the API", async () => {
    withUser(null);
    const result = await send.sendWhatsAppText({ body: "hai", toPhone: "abc" });

    assert.equal(result.ok, false);
    assert.equal(result.status, "failed");
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("service-window guard", () => {
  test("skips when the recipient is not a known user (no notification, no send)", async () => {
    withUser(null);
    const result = await send.sendWhatsAppText({ body: "hai", toPhone: "081234567890" });

    assert.equal(result.ok, false);
    assert.equal(result.status, "skipped_outside_window");
    assert.equal(fetchMock.mock.callCount(), 0, "must not contact WhatsApp API");

    const messageLogs = logsTo(schema.messageLogs);
    assert.equal(messageLogs.length, 1);
    assert.equal(messageLogs[0].values.costType, "skipped_outside_window");
    assert.equal(messageLogs[0].values.processedStatus, "skipped");
    assert.equal(logsTo(schema.dashboardNotifications).length, 0);
  });

  test("skips and notifies when the user is OUTSIDE the 24h window", async () => {
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() - 60_000) });
    const result = await send.sendWhatsAppText({ body: "hai", toPhone: "081234567890" });

    assert.equal(result.status, "skipped_outside_window");
    assert.equal(fetchMock.mock.callCount(), 0);

    const messageLogs = logsTo(schema.messageLogs);
    assert.equal(messageLogs[0].values.costType, "skipped_outside_window");

    const notifications = logsTo(schema.dashboardNotifications);
    assert.equal(notifications.length, 1, "a dashboard notification must replace the skipped message");
    assert.equal(notifications[0].values.type, "whatsapp_skipped");
    assert.equal(notifications[0].values.userId, "u1");
  });

  test("skips when serviceWindowUntil is null", async () => {
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: null });
    const result = await send.sendWhatsAppText({ body: "hai", toPhone: "081234567890" });

    assert.equal(result.status, "skipped_outside_window");
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("inside-window send", () => {
  test("does not send (and logs failed) when the Cloud API is not configured", async () => {
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() + 60_000) });
    const result = await send.sendWhatsAppText({ body: "hai", toPhone: "081234567890" });

    assert.equal(result.ok, false);
    assert.equal(result.status, "failed");
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal(logsTo(schema.messageLogs)[0].values.costType, "free_window");
  });

  test("sends through the Cloud API and logs free_window when inside the window", async () => {
    configurePlatform();
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() + 60_000) });

    const result = await send.sendWhatsAppText({ body: "hai", toPhone: "081234567890" });

    assert.equal(result.ok, true);
    assert.equal(result.status, "sent");
    assert.equal(result.ok && result.messageId, "wamid.123");
    assert.equal(fetchMock.mock.callCount(), 1, "exactly one Cloud API call");

    const messageLogs = logsTo(schema.messageLogs);
    assert.equal(messageLogs[0].values.costType, "free_window");
    assert.equal(messageLogs[0].values.processedStatus, "processed");
    assert.equal(logsTo(schema.dashboardNotifications).length, 0);
  });

  test("reports failure when the Cloud API responds with an error", async () => {
    configurePlatform();
    fetchMock.mock.mockImplementation(async () => errorResponse());
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() + 60_000) });

    const result = await send.sendWhatsAppText({ body: "hai", toPhone: "081234567890" });

    assert.equal(result.ok, false);
    assert.equal(result.status, "failed");
    assert.equal(logsTo(schema.messageLogs)[0].values.processedStatus, "failed");
  });
});

describe("sendWhatsAppImage", () => {
  test("posts an image payload (link + caption) and logs as an image", async () => {
    configurePlatform();
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() + 60_000) });

    const result = await send.sendWhatsAppImage({
      caption: "Tagihan paket",
      imageUrl: "https://app.example.com/QRIS/qris.jpeg",
      toPhone: "081234567890",
    });

    assert.equal(result.ok, true);
    assert.equal(fetchMock.mock.callCount(), 1);

    const body = JSON.parse(
      (fetchMock.mock.calls[0].arguments[1] as RequestInit).body as string,
    ) as { image?: { caption?: string; link?: string }; type?: string };
    assert.equal(body.type, "image");
    assert.equal(body.image?.link, "https://app.example.com/QRIS/qris.jpeg");
    assert.equal(body.image?.caption, "Tagihan paket");

    assert.equal(logsTo(schema.messageLogs)[0].values.messageType, "image");
    // The caption is what's human-readable, so it's logged as the body.
    assert.equal(logsTo(schema.messageLogs)[0].values.body, "Tagihan paket");
  });

  test("honors the service-window guard (no send outside the window)", async () => {
    configurePlatform();
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() - 60_000) });

    const result = await send.sendWhatsAppImage({
      caption: "Tagihan paket",
      imageUrl: "https://app.example.com/QRIS/qris.jpeg",
      toPhone: "081234567890",
    });

    assert.equal(result.status, "skipped_outside_window");
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("sendWhatsAppReply dispatch", () => {
  test("string reply goes out as a text message", async () => {
    configurePlatform();
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() + 60_000) });

    await send.sendWhatsAppReply({ reply: "hai", toPhone: "081234567890" });

    const body = JSON.parse(
      (fetchMock.mock.calls[0].arguments[1] as RequestInit).body as string,
    ) as { type?: string };
    assert.equal(body.type, "text");
  });

  test("image reply goes out as an image message", async () => {
    configurePlatform();
    withUser({ id: "u1", phone: "6281234567890", serviceWindowUntil: new Date(Date.now() + 60_000) });

    await send.sendWhatsAppReply({
      reply: {
        caption: "Tagihan paket",
        imageUrl: "https://app.example.com/QRIS/qris.jpeg",
        type: "image",
      },
      toPhone: "081234567890",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0].arguments[1] as RequestInit).body as string,
    ) as { type?: string };
    assert.equal(body.type, "image");
  });
});
