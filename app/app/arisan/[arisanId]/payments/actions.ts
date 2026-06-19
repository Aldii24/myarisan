"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArisanAdmin } from "@/lib/auth/user";
import {
  confirmPaymentById,
  rejectPaymentById,
} from "@/lib/payments/confirm-payment";

function parsePositiveAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

export async function confirmPaymentAction(
  arisanId: string,
  paymentId: string,
  formData: FormData,
) {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    redirect(`/app/arisan/${arisanId}/payments`);
  }

  const amount = parsePositiveAmount(formData.get("amount"));

  if (!amount) {
    redirect(`/app/arisan/${arisanId}/payments/${paymentId}`);
  }

  const updated = await confirmPaymentById({
    actorUserId: context.user.id,
    amount,
    arisanId,
    paymentId,
  });

  if (!updated) {
    redirect(`/app/arisan/${arisanId}/payments`);
  }

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/payments`);
  revalidatePath(`/app/arisan/${arisanId}/payments/${paymentId}`);
  redirect(`/app/arisan/${arisanId}/payments`);
}

export async function rejectPaymentAction(arisanId: string, paymentId: string) {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    redirect(`/app/arisan/${arisanId}/payments`);
  }

  const updated = await rejectPaymentById({
    actorUserId: context.user.id,
    arisanId,
    paymentId,
  });

  if (!updated) {
    redirect(`/app/arisan/${arisanId}/payments`);
  }

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/payments`);
  revalidatePath(`/app/arisan/${arisanId}/payments/${paymentId}`);
  redirect(`/app/arisan/${arisanId}/payments`);
}
