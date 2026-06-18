"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { payments } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { requireArisanAdmin } from "@/lib/auth/user";

function parsePositiveAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

async function getPaymentForAdmin(arisanId: string, paymentId: string) {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return null;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.arisanGroupId, arisanId)))
    .limit(1);

  if (!payment) {
    return null;
  }

  return { ...context, payment };
}

export async function confirmPaymentAction(
  arisanId: string,
  paymentId: string,
  formData: FormData,
) {
  const context = await getPaymentForAdmin(arisanId, paymentId);

  if (!context) {
    redirect(`/app/arisan/${arisanId}/payments`);
  }

  const amount = parsePositiveAmount(formData.get("amount"));

  if (!amount) {
    redirect(`/app/arisan/${arisanId}/payments/${paymentId}`);
  }

  const [updatedPayment] = await db
    .update(payments)
    .set({
      amount,
      confirmedAt: new Date(),
      confirmedByUserId: context.user.id,
      status: "confirmed",
    })
    .where(and(eq(payments.id, paymentId), eq(payments.arisanGroupId, arisanId)))
    .returning();

  await createAuditLog({
    action:
      context.payment.amount !== amount
        ? "payment.edit_amount_and_confirm"
        : "payment.confirm",
    actorUserId: context.user.id,
    afterJson: {
      amount: updatedPayment.amount,
      status: updatedPayment.status,
    },
    arisanGroupId: arisanId,
    beforeJson: {
      amount: context.payment.amount,
      status: context.payment.status,
    },
    entityId: paymentId,
    entityType: "payment",
  });

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/payments`);
  revalidatePath(`/app/arisan/${arisanId}/payments/${paymentId}`);
  redirect(`/app/arisan/${arisanId}/payments`);
}

export async function rejectPaymentAction(arisanId: string, paymentId: string) {
  const context = await getPaymentForAdmin(arisanId, paymentId);

  if (!context) {
    redirect(`/app/arisan/${arisanId}/payments`);
  }

  const [updatedPayment] = await db
    .update(payments)
    .set({
      confirmedAt: null,
      confirmedByUserId: null,
      status: "rejected",
    })
    .where(and(eq(payments.id, paymentId), eq(payments.arisanGroupId, arisanId)))
    .returning();

  await createAuditLog({
    action: "payment.reject",
    actorUserId: context.user.id,
    afterJson: {
      status: updatedPayment.status,
    },
    arisanGroupId: arisanId,
    beforeJson: {
      status: context.payment.status,
    },
    entityId: paymentId,
    entityType: "payment",
  });

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/payments`);
  revalidatePath(`/app/arisan/${arisanId}/payments/${paymentId}`);
  redirect(`/app/arisan/${arisanId}/payments`);
}
