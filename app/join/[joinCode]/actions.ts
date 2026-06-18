"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { arisanGroups, memberships, users } from "@/db/schema";
import { createSession } from "@/lib/auth/session";
import { findUserForLogin, normalizePhone } from "@/lib/auth/user";
import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin";

export type JoinFormState = {
  error?: string;
};

function isValidIndonesianPhone(phone: string) {
  return /^62\d{8,15}$/.test(phone);
}

export async function joinArisanAction(
  joinCode: string,
  _state: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const memberId = String(formData.get("memberId") ?? "");
  const rawPhone = String(formData.get("phone") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");
  const normalizedPhone = normalizePhone(rawPhone);

  if (!memberId) {
    return { error: "Pilih nama kamu dulu." };
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

  const [group] = await db
    .select({ id: arisanGroups.id })
    .from(arisanGroups)
    .where(eq(arisanGroups.joinCode, joinCode.toUpperCase()))
    .limit(1);

  if (!group) {
    return { error: "Kode arisan tidak ditemukan." };
  }

  const [member] = await db
    .select({
      displayName: memberships.displayName,
      id: memberships.id,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.id, memberId),
        eq(memberships.arisanGroupId, group.id),
        eq(memberships.role, "member"),
        eq(memberships.joinStatus, "invited"),
        sql`${memberships.userId} is null`,
      ),
    )
    .limit(1);

  if (!member) {
    return {
      error: "Nama ini sudah terdaftar atau tidak tersedia. Muat ulang halaman dan coba lagi.",
    };
  }

  let user = await findUserForLogin(normalizedPhone);

  if (user) {
    if (user.pinHash && !(await verifyPin(pin, user.pinHash))) {
      return {
        error:
          "Nomor ini sudah terdaftar. Masukkan PIN yang benar, atau login dulu jika lupa.",
      };
    }

    const [existingMembership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, user.id),
          eq(memberships.arisanGroupId, group.id),
          ne(memberships.joinStatus, "removed"),
        ),
      )
      .limit(1);

    if (existingMembership) {
      return {
        error: "Nomor ini sudah terdaftar di arisan ini.",
      };
    }

    if (!user.pinHash) {
      await db
        .update(users)
        .set({
          name: user.name ?? member.displayName,
          pinHash: await hashPin(pin),
        })
        .where(eq(users.id, user.id));
    }
  } else {
    const [createdUser] = await db
      .insert(users)
      .values({
        name: member.displayName,
        phone: normalizedPhone,
        pinHash: await hashPin(pin),
      })
      .returning();

    user = createdUser;
  }

  const [claimedMembership] = await db
    .update(memberships)
    .set({
      joinStatus: "claimed",
      role: "member",
      userId: user.id,
    })
    .where(
      and(
        eq(memberships.id, member.id),
        eq(memberships.arisanGroupId, group.id),
        eq(memberships.joinStatus, "invited"),
        sql`${memberships.userId} is null`,
      ),
    )
    .returning({ id: memberships.id });

  if (!claimedMembership) {
    return {
      error: "Nama ini baru saja terdaftar. Pilih nama lain atau hubungi admin.",
    };
  }

  await createSession(user.id);

  redirect(`/app/arisan/${group.id}`);
}
