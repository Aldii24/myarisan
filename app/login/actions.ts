"use server";

import { redirect } from "next/navigation";

import { createSession } from "@/lib/auth/session";
import { findUserForLogin, getUserMemberships } from "@/lib/auth/user";
import { isValidPin, verifyPin } from "@/lib/auth/pin";

export type LoginFormState = {
  error?: string;
};

export async function loginAction(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const phone = String(formData.get("phone") ?? "");
  const pin = String(formData.get("pin") ?? "");

  if (!phone.trim() || !isValidPin(pin)) {
    return { error: "Masukkan nomor WhatsApp dan PIN 4 angka." };
  }

  const user = await findUserForLogin(phone);

  if (!user || !(await verifyPin(pin, user.pinHash))) {
    return { error: "Nomor WhatsApp atau PIN tidak sesuai." };
  }

  await createSession(user.id);

  const memberships = await getUserMemberships(user.id);

  if (memberships.length === 1) {
    redirect(`/app/arisan/${memberships[0].arisanGroupId}`);
  }

  redirect("/app");
}
