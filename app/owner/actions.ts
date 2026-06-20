"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approvePackageInvoice,
  rejectPackageInvoice,
  requireOwnerUser,
} from "@/lib/owner";

async function requireOwnerForAction() {
  const owner = await requireOwnerUser();

  if (owner.error || !owner.user) {
    redirect("/owner");
  }

  return owner.user;
}

export async function approveInvoiceAction(invoiceId: string) {
  const owner = await requireOwnerForAction();

  const result = await approvePackageInvoice({
    invoiceId,
    ownerUserId: owner.id,
  });

  if (result.ok) {
    revalidatePath(`/app/arisan/${result.arisanGroupId}`);
    revalidatePath(`/app/arisan/${result.arisanGroupId}/paket`);
  }

  revalidatePath("/owner");
  redirect("/owner");
}

export async function rejectInvoiceAction(invoiceId: string) {
  const owner = await requireOwnerForAction();

  const result = await rejectPackageInvoice({
    invoiceId,
    ownerUserId: owner.id,
  });

  if (result.ok) {
    revalidatePath(`/app/arisan/${result.arisanGroupId}/paket`);
  }

  revalidatePath("/owner");
  redirect("/owner");
}
