"use server";

import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth/session";
import { hashPin, isValidPin } from "@/lib/auth/pin";
import { findUserForLogin, normalizePhone } from "@/lib/auth/user";

export type RegisterFormState = {
  error?: string;
};

function isValidIndonesianPhone(phone: string) {
  return /^62\d{8,15}$/.test(phone);
}

export async function registerAction(
  _state: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");
  const normalizedPhone = normalizePhone(rawPhone);

  if (!name) {
    return { error: "Isi nama kamu dulu." };
  }

  if (!normalizedPhone || !isValidIndonesianPhone(normalizedPhone)) {
    return { error: "Masukkan nomor WhatsApp Indonesia yang benar." };
  }

  if (!isValidPin(pin)) {
    return { error: "PIN harus 4 angka." };
  }

  if (pin !== confirmPin) {
    return { error: "Konfirmasi PIN belum sama." };
  }

  const existing = await findUserForLogin(normalizedPhone);

  if (existing) {
    return {
      error: "Nomor ini sudah terdaftar. Silakan masuk dengan PIN kamu.",
    };
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      name,
      phone: normalizedPhone,
      pinHash: await hashPin(pin),
    })
    .returning({ id: users.id });

  await createSession(createdUser.id);

  redirect("/app/arisan/new");
}
