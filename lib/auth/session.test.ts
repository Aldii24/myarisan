import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { before, beforeEach, describe, mock, test } from "node:test";

import { createCookieJar } from "@/lib/testing/next-mocks";

// Auth sessions (tasks.md #4 / #17): the session cookie is an HMAC-signed
// payload. A valid signature round-trips to the user id; tampering, a bad
// signature, or an expired payload must all be rejected.
//
// next/headers cookies() is mocked with an in-memory jar so the real signing /
// verification in session.ts runs unchanged.

const SECRET = "test-session-secret";
const COOKIE = "myarisan_session";

let jar: ReturnType<typeof createCookieJar>;
type SessionModule = typeof import("@/lib/auth/session");
let session: SessionModule;

before(async () => {
  process.env.SESSION_SECRET = SECRET;
  mock.module("next/headers", {
    namedExports: { cookies: async () => jar },
  });
  session = await import("@/lib/auth/session");
});

beforeEach(() => {
  jar = createCookieJar();
});

// Mirrors session.ts signing so the test can craft tampered / expired cookies.
function sign(payload: { userId: string; expiresAt: string }) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return { cookie: `${encoded}.${signature}`, encoded, signature };
}

describe("createSession / getSessionUserId round-trip", () => {
  test("a freshly created session resolves back to the user id", async () => {
    await session.createSession("user-123");
    assert.ok(jar.store.get(COOKIE), "cookie should be set");
    assert.equal(await session.getSessionUserId(), "user-123");
  });
});

describe("getSessionUserId rejects bad sessions", () => {
  test("returns null when no cookie is present", async () => {
    assert.equal(await session.getSessionUserId(), null);
  });

  test("rejects a tampered payload (signature no longer matches)", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { signature } = sign({ expiresAt: future, userId: "user-1" });
    const forged = Buffer.from(
      JSON.stringify({ expiresAt: future, userId: "attacker" }),
      "utf8",
    ).toString("base64url");
    jar.store.set(COOKIE, `${forged}.${signature}`);

    assert.equal(await session.getSessionUserId(), null);
  });

  test("rejects a wrong signature", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { encoded } = sign({ expiresAt: future, userId: "user-1" });
    jar.store.set(COOKIE, `${encoded}.not-a-valid-signature`);

    assert.equal(await session.getSessionUserId(), null);
  });

  test("rejects an expired but correctly signed session", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const { cookie } = sign({ expiresAt: past, userId: "user-1" });
    jar.store.set(COOKIE, cookie);

    assert.equal(await session.getSessionUserId(), null);
  });

  test("rejects a structurally broken cookie", async () => {
    jar.store.set(COOKIE, "no-dot-separator");
    assert.equal(await session.getSessionUserId(), null);
  });
});

describe("deleteSession", () => {
  test("removes the session so it no longer resolves", async () => {
    await session.createSession("user-9");
    assert.equal(await session.getSessionUserId(), "user-9");

    await session.deleteSession();
    assert.equal(await session.getSessionUserId(), null);
  });
});
