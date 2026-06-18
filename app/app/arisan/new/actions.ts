"use server";

import { redirect } from "next/navigation";

import { db } from "@/db";
import { arisanGroups, memberships, periods } from "@/db/schema";
import {
  attachFreePlanIfAvailable,
  buildActivePeriod,
  generateUniqueJoinCode,
} from "@/lib/arisan";
import { requireUser } from "@/lib/auth/user";

export type CreateArisanState = {
  error?: string;
};

function parsePositiveAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

export async function createArisanAction(
  _state: CreateArisanState,
  formData: FormData,
): Promise<CreateArisanState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parsePositiveAmount(formData.get("amount"));
  const periodType = String(formData.get("periodType"));
  const dueDay = Number(String(formData.get("dueDay") ?? "").replace(/\D/g, ""));
  const bankAccountText = String(formData.get("bankAccountText") ?? "").trim();

  if (!name || name.length < 3) {
    return { error: "Nama arisan minimal 3 karakter." };
  }

  if (!amount) {
    return { error: "Nominal setoran harus diisi dengan angka." };
  }

  if (periodType !== "weekly" && periodType !== "monthly") {
    return { error: "Pilih periode arisan." };
  }

  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    return { error: "Batas setor harus angka 1 sampai 28." };
  }

  if (!bankAccountText) {
    return { error: "Rekening admin atau e-wallet admin harus diisi." };
  }

  const now = new Date();
  const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dueDay))
    .toISOString()
    .slice(0, 10);
  const activePeriod = buildActivePeriod(periodType, dueDate);
  const joinCode = await generateUniqueJoinCode();

  const [group] = await db
    .insert(arisanGroups)
    .values({
      adminUserId: user.id,
      amountPerPeriod: amount,
      bankAccountText,
      dueDay,
      joinCode,
      name,
      periodType,
      status: "active",
    })
    .returning({ id: arisanGroups.id });

  await db.insert(memberships).values({
    arisanGroupId: group.id,
    displayName: user.name ?? "Admin",
    joinStatus: "claimed",
    role: "admin",
    userId: user.id,
  });

  await db.insert(periods).values({
    arisanGroupId: group.id,
    dueDate: activePeriod.dueDate,
    name: activePeriod.name,
    startDate: activePeriod.startDate,
    status: "active",
  });

  await attachFreePlanIfAvailable(group.id, user.id);

  redirect(`/app/arisan/${group.id}`);
}
