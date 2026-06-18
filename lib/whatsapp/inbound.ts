import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { messageLogs, users } from "@/db/schema";
import { findUserForLogin, normalizePhone } from "@/lib/auth/user";

const serviceWindowMilliseconds = 24 * 60 * 60 * 1000;

async function ensureWhatsAppUser(phone: string) {
  const existingUser = await findUserForLogin(phone);

  if (existingUser) {
    return existingUser;
  }

  await db
    .insert(users)
    .values({
      phone,
      pinHash: null,
    })
    .onConflictDoNothing({ target: users.phone });

  const createdUser = await findUserForLogin(phone);

  if (!createdUser) {
    throw new Error("Gagal membuat pengguna WhatsApp.");
  }

  return createdUser;
}

export async function recordInboundWhatsAppMessage(input: {
  body?: string | null;
  fromPhone: string;
  mediaUrl?: string | null;
  messageType: "image" | "text";
  whatsappMessageId: string;
}) {
  const normalizedPhone = normalizePhone(input.fromPhone);

  if (!/^\d{8,15}$/.test(normalizedPhone)) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }

  const user = await ensureWhatsAppUser(normalizedPhone);
  const now = new Date();
  const serviceWindowUntil = new Date(now.getTime() + serviceWindowMilliseconds);

  await db
    .update(users)
    .set({
      lastInboundAt: now,
      serviceWindowUntil,
    })
    .where(eq(users.id, user.id));

  const [inboundLog] = await db
    .insert(messageLogs)
    .values({
      body: input.body?.trim() || null,
      costType: "unknown",
      direction: "inbound",
      fromPhone: normalizedPhone,
      mediaUrl: input.mediaUrl ?? null,
      messageType: input.messageType,
      processedStatus: "received",
      userId: user.id,
      whatsappMessageId: input.whatsappMessageId,
    })
    .onConflictDoNothing({ target: messageLogs.whatsappMessageId })
    .returning({ id: messageLogs.id });

  return {
    duplicate: !inboundLog,
    fromPhone: normalizedPhone,
    logId: inboundLog?.id ?? null,
    serviceWindowUntil,
    userId: user.id,
  };
}

export async function updateInboundWhatsAppStatus(
  logId: string,
  processedStatus: "failed" | "processed" | "skipped",
) {
  await db
    .update(messageLogs)
    .set({ processedStatus })
    .where(eq(messageLogs.id, logId));
}
