import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups, invoices, plans, users } from "@/db/schema";
import { formatRupiah } from "@/lib/arisan";

import { getWhatsAppConfig, reportMissingWhatsAppEnv } from "./config";
import { compose, field, header, italic } from "./format";
import { sendWhatsAppText } from "./send-message";

function getAppUrl() {
  reportMissingWhatsAppEnv(["NEXT_PUBLIC_APP_URL"], "links");

  return getWhatsAppConfig().appUrl;
}

// Pings the owner that an admin uploaded a package-payment proof so they can
// verify it. Sent from the shared attachInvoiceProof core, so it fires whether
// the proof arrived via the dashboard or the WhatsApp bot. Best-effort: the send
// guard handles the 24h window (falling back to a dashboard notification), and
// the caller swallows any error so a hiccup here never blocks the upload.
export async function notifyOwnerInvoiceProofUploaded(invoiceId: string) {
  const ownerPhone = process.env.OWNER_PHONE?.trim();

  if (!ownerPhone) {
    return;
  }

  const [row] = await db
    .select({
      adminName: users.name,
      adminPhone: users.phone,
      amount: invoices.amount,
      arisanName: arisanGroups.name,
      planName: plans.name,
    })
    .from(invoices)
    .innerJoin(users, eq(users.id, invoices.adminUserId))
    .innerJoin(arisanGroups, eq(arisanGroups.id, invoices.arisanGroupId))
    .innerJoin(plans, eq(plans.id, invoices.planId))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!row) {
    return;
  }

  const body = compose(
    header("🔔", "Bukti Paket Baru", row.arisanName),
    [
      field("💎", "Paket", `${row.planName} · ${formatRupiah(row.amount)}`),
      field("👤", "Admin", `${row.adminName ?? "Admin"} (${row.adminPhone})`),
    ].join("\n"),
    `🖼️ ${italic("Cek & verifikasi bukti:")}\n${getAppUrl()}/owner`,
  );

  await sendWhatsAppText({ body, toPhone: ownerPhone });
}
