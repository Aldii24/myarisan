import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { messageLogs, users } from "@/db/schema";
import { findUserForLogin, normalizePhone } from "@/lib/auth/user";

import { parseWhatsAppCommand } from "./command-parser";
import { handleWhatsAppCommand } from "./handle-command";

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

export async function processInboundWhatsAppText(input: {
  fromPhone: string;
  text: string;
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
      body: input.text,
      costType: "unknown",
      direction: "inbound",
      fromPhone: normalizedPhone,
      messageType: "text",
      processedStatus: "received",
      userId: user.id,
      whatsappMessageId: input.whatsappMessageId,
    })
    .onConflictDoNothing({ target: messageLogs.whatsappMessageId })
    .returning({ id: messageLogs.id });

  if (!inboundLog) {
    return {
      command: null,
      duplicate: true,
      fromPhone: normalizedPhone,
      reply: null,
      serviceWindowUntil,
      userId: user.id,
    };
  }

  try {
    const command = parseWhatsAppCommand(input.text);
    const reply = await handleWhatsAppCommand({
      command,
      userId: user.id,
    });

    await db
      .update(messageLogs)
      .set({ processedStatus: "processed" })
      .where(eq(messageLogs.id, inboundLog.id));

    return {
      command,
      duplicate: false,
      fromPhone: normalizedPhone,
      reply,
      serviceWindowUntil,
      userId: user.id,
    };
  } catch (error) {
    await db
      .update(messageLogs)
      .set({ processedStatus: "failed" })
      .where(eq(messageLogs.id, inboundLog.id));

    throw error;
  }
}
