import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPin, isValidPin } from "@/lib/auth/pin";

import {
  clearPendingAction,
  setPendingAction,
} from "./conversation-state";

const cancelKeywords = new Set(["batal", "cancel"]);

// Step 1: user typed "reset pin". Open the flow and ask for the new PIN.
export async function beginResetPin(userId: string) {
  await setPendingAction(userId, "reset_pin");

  return `Reset PIN MyArisan.
Kirim PIN baru kamu berupa 4 angka (contoh: 1234).
Ketik BATAL untuk membatalkan.`;
}

// Step 2: user is mid-flow. Interpret the message as the new PIN.
export async function handleResetPinInput(userId: string, text: string) {
  const trimmed = text.trim();
  const normalized = trimmed.replace(/\s+/g, " ").toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);

    return "Reset PIN dibatalkan. PIN lama kamu masih berlaku.";
  }

  if (!isValidPin(trimmed)) {
    return `PIN harus berupa 4 angka, contoh: 1234.
Kirim PIN baru atau ketik BATAL untuk membatalkan.`;
  }

  const pinHash = await hashPin(trimmed);

  await db
    .update(users)
    .set({
      pinHash,
      pendingAction: null,
      pendingActionExpiresAt: null,
    })
    .where(eq(users.id, userId));

  return `PIN berhasil diperbarui ✅
Sekarang kamu bisa masuk ke dashboard MyArisan pakai PIN baru ini. Jaga kerahasiaannya ya.`;
}
