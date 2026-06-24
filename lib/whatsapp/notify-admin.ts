import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { formatDateTimeLabel } from "@/lib/arisan";

import { bold, compose, footer, header } from "./format";
import { sendWhatsAppText } from "./send-message";

// Tells the buyer (the arisan admin who paid) the owner's verdict on their
// package proof. Called from the shared approve/reject core in lib/owner.ts, so
// it fires whether the decision came from the owner dashboard or the WhatsApp
// owner flow. Best-effort: the send guard handles the 24h window, and the caller
// swallows errors so a notify hiccup never undoes the approval.
export async function notifyAdminInvoiceDecision(input: {
  adminUserId: string;
  approved: boolean;
  arisanName: string;
  planName: string;
  activeUntil?: Date | null;
  reason?: string | null;
}) {
  const [admin] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, input.adminUserId))
    .limit(1);

  if (!admin?.phone) {
    return;
  }

  const body = input.approved
    ? compose(
        header("🎉", "Paket Aktif", input.arisanName),
        `Paket ${bold(input.planName)} sudah aktif. Terima kasih sudah membayar! 🙏`,
        input.activeUntil
          ? `📅 Aktif sampai ${formatDateTimeLabel(input.activeUntil)}.`
          : null,
      )
    : compose(
        header("⚠️", "Bukti Paket Ditolak", input.arisanName),
        `Maaf, bukti paket ${bold(input.planName)} ditolak.${
          input.reason ? `\nAlasan: ${input.reason}` : ""
        }`,
        footer("Silakan upload ulang lewat PAKET."),
      );

  await sendWhatsAppText({ body, toPhone: admin.phone });
}
