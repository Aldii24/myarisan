"use server";

import { redirect } from "next/navigation";

import { createArisanGroup } from "@/lib/arisan";
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

  const group = await createArisanGroup({
    adminDisplayName: user.name ?? "Admin",
    adminUserId: user.id,
    amountPerPeriod: amount,
    bankAccountText,
    dueDay,
    name,
    periodType,
  });

  redirect(`/app/arisan/${group.id}`);
}
