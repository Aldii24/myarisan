import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups, memberships, users } from "@/db/schema";
import { formatRupiah } from "@/lib/arisan";
import { createPaymentProofFromUpload } from "@/lib/payments/create-payment-proof";

import { getWhatsAppConfig, reportMissingWhatsAppEnv } from "./config";
import { sendWhatsAppText } from "./send-message";

function getAppUrl() {
  reportMissingWhatsAppEnv(["NEXT_PUBLIC_APP_URL"], "links");

  return getWhatsAppConfig().appUrl;
}

// The shared dashboard notification is created in createPaymentProofFromUpload.
// Here we only add the in-window WhatsApp message to the admin on top of it.
async function notifyAdmin(input: {
  adminUserId: string;
  arisanId: string;
  arisanName: string;
  isDuplicate: boolean;
  memberDisplayName: string;
  paymentId: string;
}) {
  const duplicateHint = input.isDuplicate
    ? " Bukti ini mirip dengan pembayaran yang sudah pernah dikirim."
    : "";

  const [admin] = await db
    .select({
      phone: users.phone,
      serviceWindowUntil: users.serviceWindowUntil,
    })
    .from(users)
    .where(eq(users.id, input.adminUserId))
    .limit(1);

  if (!admin?.serviceWindowUntil || admin.serviceWindowUntil <= new Date()) {
    return;
  }

  await sendWhatsAppText({
    body: `Bukti pembayaran baru dari ${input.memberDisplayName} untuk ${input.arisanName}.
Status: Menunggu Dicek.${duplicateHint}
${getAppUrl()}/app/arisan/${input.arisanId}/payments/${input.paymentId}`,
    toPhone: admin.phone,
  });
}

export async function handleWhatsAppProofImage(input: {
  caption?: string | null;
  file: File;
  userId: string;
}) {
  const memberMemberships = await db
    .select({
      arisanId: memberships.arisanGroupId,
      arisanName: arisanGroups.name,
    })
    .from(memberships)
    .innerJoin(arisanGroups, eq(arisanGroups.id, memberships.arisanGroupId))
    .where(
      and(
        eq(memberships.userId, input.userId),
        eq(memberships.role, "member"),
        eq(memberships.joinStatus, "claimed"),
      ),
    )
    .orderBy(arisanGroups.name);

  if (memberMemberships.length === 0) {
    return {
      paymentId: null,
      reply:
        "Kamu belum terdaftar sebagai anggota arisan. Ketik JOIN <kode> atau buka dashboard untuk bergabung.",
      status: null,
    };
  }

  if (memberMemberships.length > 1) {
    return {
      paymentId: null,
      reply:
        "Kamu terdaftar di beberapa arisan. Agar bukti tidak masuk ke arisan yang salah, upload dari dashboard untuk sekarang.",
      status: null,
    };
  }

  const membership = memberMemberships[0];
  const result = await createPaymentProofFromUpload({
    arisanId: membership.arisanId,
    file: input.file,
    note: input.caption,
    userId: input.userId,
  });

  if (!result.ok) {
    return {
      paymentId: null,
      reply: result.error,
      status: null,
    };
  }

  if (result.notifyAdmin) {
    await notifyAdmin({
      adminUserId: result.adminUserId,
      arisanId: membership.arisanId,
      arisanName: result.arisanName,
      isDuplicate: result.isDuplicate,
      memberDisplayName: result.memberDisplayName,
      paymentId: result.paymentId,
    });
  }

  const replyParts = result.isDuplicate
    ? [
        "Bukti diterima, tapi mirip dengan pembayaran yang sudah pernah dikirim.",
        "Status: perlu dicek admin.",
      ]
    : ["Bukti bayar diterima ✅ Status: menunggu dicek admin."];

  if (result.detectedAmount) {
    replyParts.push(`Nominal terbaca: ${formatRupiah(result.detectedAmount)}`);
  }

  if (!result.isDuplicate && result.warnings.length > 0) {
    replyParts.push("Ada data yang perlu dicek admin.");
  }

  return {
    detectedAmount: result.detectedAmount,
    hasWarnings: result.warnings.length > 0,
    paymentId: result.paymentId,
    reply: replyParts.join("\n"),
    status: result.status,
  };
}
