import "server-only";

import { formatDateTimeLabel, formatRupiah } from "@/lib/arisan";
import {
  approvePackageInvoice,
  getInvoicesAwaitingReview,
  isOwnerUserId,
  rejectPackageInvoice,
} from "@/lib/owner";

import { getWhatsAppConfig, reportMissingWhatsAppEnv } from "./config";
import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { sendWhatsAppText } from "./send-message";

const cancelKeywords = new Set(["batal", "cancel", "selesai"]);

type OwnerReviewItem = {
  id: string;
  arisanName: string;
  planName: string;
  amount: number;
  adminName: string | null;
  adminPhone: string;
};

type OwnerReviewData = {
  step: "select" | "decide";
  items: OwnerReviewItem[];
  selectedId?: string;
};

function getAppUrl() {
  reportMissingWhatsAppEnv(["NEXT_PUBLIC_APP_URL"], "links");

  return getWhatsAppConfig().appUrl;
}

async function loadItems(): Promise<OwnerReviewItem[]> {
  const rows = await getInvoicesAwaitingReview();

  return rows.map((row) => ({
    adminName: row.adminName,
    adminPhone: row.adminPhone,
    amount: row.amount,
    arisanName: row.arisanName,
    id: row.id,
    planName: row.planName,
  }));
}

function renderList(items: OwnerReviewItem[]) {
  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.arisanName} - ${item.planName} ${formatRupiah(
          item.amount,
        )} (${item.adminName ?? "Admin"})`,
    )
    .join("\n");
}

function selectPrompt(items: OwnerReviewItem[], prefix?: string) {
  const body = `${items.length} bukti paket menunggu dicek:
${renderList(items)}

Balas nomor untuk memproses, atau ketik SELESAI untuk berhenti.`;

  return [prefix, body].filter(Boolean).join("\n\n");
}

// Sends the admin a heads-up about the owner's decision, but only inside the
// 24h service window (the send guard also enforces this and logs a skip).
async function notifyAdmin(input: {
  adminPhone: string;
  arisanName: string;
  approved: boolean;
  planName: string;
  reason?: string | null;
}) {
  const body = input.approved
    ? `Paket ${input.planName} untuk ${input.arisanName} sudah aktif ✅ Terima kasih sudah membayar.`
    : `Maaf, bukti paket ${input.planName} untuk ${input.arisanName} ditolak.${
        input.reason ? ` Alasan: ${input.reason}` : ""
      } Silakan upload ulang lewat PAKET.`;

  await sendWhatsAppText({ body, toPhone: input.adminPhone });
}

// Entry point from the owner `paket`/`owner` command. Owner-only; lists invoices
// awaiting verification and opens the select step.
export async function beginOwnerReview(userId: string) {
  if (!(await isOwnerUserId(userId))) {
    return "Perintah ini hanya untuk owner MyArisan.";
  }

  const items = await loadItems();

  if (items.length === 0) {
    return "Tidak ada bukti paket yang menunggu dicek saat ini.";
  }

  await setPendingAction(userId, "manage_owner_review", {
    items,
    step: "select",
  } satisfies OwnerReviewData);

  return selectPrompt(items);
}

export async function handleOwnerInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "Selesai mengecek bukti paket.";
  }

  const data = state.data as OwnerReviewData;

  if (data.step === "select") {
    const choice = Number(trimmed.replace(/\D/g, ""));

    if (!Number.isInteger(choice) || choice < 1 || choice > data.items.length) {
      return `Balas dengan nomor 1 sampai ${data.items.length}, atau ketik SELESAI untuk berhenti.`;
    }

    const selected = data.items[choice - 1];

    await setPendingAction(userId, "manage_owner_review", {
      ...data,
      selectedId: selected.id,
      step: "decide",
    } satisfies OwnerReviewData);

    return `${selected.arisanName} - ${selected.planName} ${formatRupiah(
      selected.amount,
    )}
Admin: ${selected.adminName ?? "Admin"} (${selected.adminPhone})
Bukti: ${getAppUrl()}/owner

Balas TERIMA untuk aktifkan paket, atau TOLAK (boleh tambah alasan: TOLAK <alasan>).`;
  }

  // step === "decide"
  const selected = data.items.find((item) => item.id === data.selectedId);

  if (!selected) {
    await clearPendingAction(userId);
    return "Tagihan tidak ditemukan lagi. Ketik OWNER untuk mulai lagi.";
  }

  let decisionText: string;

  if (normalized === "terima") {
    const result = await approvePackageInvoice({
      invoiceId: selected.id,
      ownerUserId: userId,
    });

    if (!result.ok) {
      await clearPendingAction(userId);
      return result.error;
    }

    await notifyAdmin({
      adminPhone: selected.adminPhone,
      approved: true,
      arisanName: result.arisanName,
      planName: result.planName,
    });

    decisionText = `${selected.arisanName} - paket ${
      result.planName
    } aktif sampai ${formatDateTimeLabel(result.currentPeriodEnd)} ✅`;
  } else if (normalized === "tolak" || normalized.startsWith("tolak ")) {
    const reason = trimmed.slice("tolak".length).trim() || null;
    const result = await rejectPackageInvoice({
      invoiceId: selected.id,
      ownerUserId: userId,
      reason,
    });

    if (!result.ok) {
      await clearPendingAction(userId);
      return result.error;
    }

    await notifyAdmin({
      adminPhone: selected.adminPhone,
      approved: false,
      arisanName: result.arisanName,
      planName: result.planName,
      reason,
    });

    decisionText = `${selected.arisanName} - bukti paket ditolak.`;
  } else {
    return "Balas TERIMA untuk aktifkan paket, atau TOLAK (boleh tambah alasan: TOLAK <alasan>).";
  }

  const remaining = await loadItems();

  if (remaining.length === 0) {
    await clearPendingAction(userId);
    return `${decisionText}
Semua bukti paket sudah diproses.`;
  }

  await setPendingAction(userId, "manage_owner_review", {
    items: remaining,
    step: "select",
  } satisfies OwnerReviewData);

  return selectPrompt(remaining, decisionText);
}
