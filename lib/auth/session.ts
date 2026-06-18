import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const sessionCookieName = "myarisan_session";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

type SessionPayload = {
  userId: string;
  expiresAt: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is required for auth sessions.");
  }

  return secret;
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function verifySignature(encodedPayload: string, signature: string) {
  const expected = Buffer.from(signPayload(encodedPayload), "base64url");
  const actual = Buffer.from(signature, "base64url");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function getSessionPayload() {
  const session = (await cookies()).get(sessionCookieName)?.value;

  if (!session) {
    return null;
  }

  const [encodedPayload, signature] = session.split(".");

  if (!encodedPayload || !signature || !verifySignature(encodedPayload, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.userId || new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  const encodedPayload = encodePayload({
    userId,
    expiresAt: expiresAt.toISOString(),
  });

  (await cookies()).set(sessionCookieName, `${encodedPayload}.${signPayload(encodedPayload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession() {
  (await cookies()).delete(sessionCookieName);
}

export async function getSessionUserId() {
  return (await getSessionPayload())?.userId ?? null;
}
