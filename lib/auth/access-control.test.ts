import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, mock, test } from "node:test";

import { createFakeDb, type FakeDbResponder } from "@/lib/testing/fake-db";
import {
  createCookieJar,
  fakeRedirect,
  isRedirectTo,
} from "@/lib/testing/next-mocks";

// Access control (tasks.md #5 / #17): every guard must validate
// user_id + arisan_group_id + role and never trust URL params alone. Owner
// access is detected from OWNER_PHONE. Failures redirect; they do not silently
// pass.
//
// next/headers (cookies), next/navigation (redirect) and @/db are mocked once;
// the real session + membership + owner logic runs against them. A user is
// "logged in" by calling the real createSession into the in-memory cookie jar.

const SECRET = "test-session-secret";

let jar: ReturnType<typeof createCookieJar>;
let respond: FakeDbResponder = () => undefined;
const { db } = createFakeDb((ctx) => respond(ctx));

type Tables = typeof import("@/db/schema");
let schema: Tables;
let session: typeof import("@/lib/auth/session");
let user: typeof import("@/lib/auth/user");
let owner: typeof import("@/lib/owner");

before(async () => {
  process.env.SESSION_SECRET = SECRET;
  mock.module("@/db", { namedExports: { db, schema: {} } });
  mock.module("next/headers", { namedExports: { cookies: async () => jar } });
  mock.module("next/navigation", { namedExports: { redirect: fakeRedirect } });

  schema = await import("@/db/schema");
  session = await import("@/lib/auth/session");
  user = await import("@/lib/auth/user");
  owner = await import("@/lib/owner");
});

beforeEach(() => {
  jar = createCookieJar();
  respond = () => undefined;
});

afterEach(() => {
  delete process.env.OWNER_PHONE;
});

async function login(userId: string) {
  await session.createSession(userId);
}

// db wiring helpers --------------------------------------------------------

function withUserAndMembership(
  userRow: { id: string; name?: string | null; phone: string },
  membershipRow: Record<string, unknown> | null,
) {
  respond = ({ op, table }) => {
    if (op === "select" && table === schema.users) {
      return [{ id: userRow.id, name: userRow.name ?? "User", phone: userRow.phone }];
    }
    if (op === "select" && table === schema.memberships) {
      return membershipRow ? [membershipRow] : [];
    }
    return undefined;
  };
}

describe("normalizePhone", () => {
  test("converts a local 0-prefixed number to 62 format", () => {
    assert.equal(user.normalizePhone("081234567890"), "6281234567890");
  });

  test("keeps an existing 62 number and strips punctuation", () => {
    assert.equal(user.normalizePhone("+62 812-3456-7890"), "6281234567890");
  });

  test("returns empty string for non-numeric input", () => {
    assert.equal(user.normalizePhone("abc"), "");
  });
});

describe("getPhoneLookupValues", () => {
  test("includes raw, normalized and +normalized variants", () => {
    const values = user.getPhoneLookupValues("081234567890");
    assert.ok(values.includes("081234567890"));
    assert.ok(values.includes("6281234567890"));
    assert.ok(values.includes("+6281234567890"));
  });
});

describe("requireUser", () => {
  test("redirects to /login when there is no session", async () => {
    await assert.rejects(
      () => user.requireUser(),
      (error) => isRedirectTo(error, "/login"),
    );
  });

  test("returns the user when a valid session exists", async () => {
    withUserAndMembership({ id: "u1", phone: "6281", name: "Andi" }, null);
    await login("u1");
    const result = await user.requireUser();
    assert.equal(result.id, "u1");
  });
});

describe("requireArisanMembership", () => {
  test("returns user + membership for a valid member", async () => {
    withUserAndMembership(
      { id: "u1", phone: "6281" },
      { arisanGroupId: "a1", arisanName: "Arisan RT", displayName: "Andi", id: "m1", role: "member" },
    );
    await login("u1");

    const { user: u, membership } = await user.requireArisanMembership("a1");
    assert.equal(u.id, "u1");
    assert.equal(membership.arisanGroupId, "a1");
    assert.equal(membership.role, "member");
  });

  test("redirects to /app/select-arisan when the user has no membership", async () => {
    withUserAndMembership({ id: "u1", phone: "6281" }, null);
    await login("u1");

    await assert.rejects(
      () => user.requireArisanMembership("a1"),
      (error) => isRedirectTo(error, "/app/select-arisan"),
    );
  });
});

describe("requireArisanAdmin (role gate)", () => {
  test("returns context for an admin", async () => {
    withUserAndMembership(
      { id: "u1", phone: "6281" },
      { arisanGroupId: "a1", arisanName: "Arisan RT", displayName: "Andi", id: "m1", role: "admin" },
    );
    await login("u1");

    const context = await user.requireArisanAdmin("a1");
    assert.ok(context);
    assert.equal(context.membership.role, "admin");
  });

  test("returns null for a member (no admin access)", async () => {
    withUserAndMembership(
      { id: "u2", phone: "6282" },
      { arisanGroupId: "a1", arisanName: "Arisan RT", displayName: "Budi", id: "m2", role: "member" },
    );
    await login("u2");

    assert.equal(await user.requireArisanAdmin("a1"), null);
  });

  test("redirects when the user is not a member of the group at all", async () => {
    withUserAndMembership({ id: "u3", phone: "6283" }, null);
    await login("u3");

    await assert.rejects(
      () => user.requireArisanAdmin("a1"),
      (error) => isRedirectTo(error, "/app/select-arisan"),
    );
  });
});

describe("requireOwnerUser (OWNER_PHONE detection)", () => {
  test("returns the user when their phone matches OWNER_PHONE", async () => {
    process.env.OWNER_PHONE = "6281111111111";
    withUserAndMembership({ id: "owner", phone: "6281111111111" }, null);
    await login("owner");

    const result = await owner.requireOwnerUser();
    assert.equal(result.error, null);
    assert.equal(result.user?.id, "owner");
  });

  test("redirects a non-owner to /app", async () => {
    process.env.OWNER_PHONE = "6281111111111";
    withUserAndMembership({ id: "u1", phone: "6289999999999" }, null);
    await login("u1");

    await assert.rejects(
      () => owner.requireOwnerUser(),
      (error) => isRedirectTo(error, "/app"),
    );
  });

  test("reports an error when OWNER_PHONE is not configured", async () => {
    withUserAndMembership({ id: "u1", phone: "6281" }, null);
    await login("u1");

    const result = await owner.requireOwnerUser();
    assert.equal(result.user, null);
    assert.match(result.error ?? "", /OWNER_PHONE/);
  });
});
