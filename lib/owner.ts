import "server-only";

import { redirect } from "next/navigation";

import { getPhoneLookupValues, requireUser } from "@/lib/auth/user";

export async function requireOwnerUser() {
  const user = await requireUser();
  const ownerPhone = process.env.OWNER_PHONE?.trim();

  if (!ownerPhone) {
    return {
      error: "OWNER_PHONE belum diatur.",
      user: null,
    };
  }

  const allowedPhones = new Set(getPhoneLookupValues(ownerPhone));

  if (!allowedPhones.has(user.phone)) {
    redirect("/app");
  }

  return {
    error: null,
    user,
  };
}
