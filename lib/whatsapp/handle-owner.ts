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
import { bold, compose, field, footer, header, italic } from "./format";

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
  return compose(
    prefix ?? null,
    header("🛡️", "Bukti Paket"),
    `Ada ${bold(`${items.length} bukti paket`)} menunggu dicek:`,
    renderList(items),
    footer("Balas NOMOR untuk memproses, atau SELESAI untuk berhenti."),
  );
}

// Entry point from the owner `paket`/`owner` command. Owner-only; lists invoices
// awaiting verification and opens the select step.
export async function beginOwnerReview(userId: string) {
  if (!(await isOwnerUserId(userId))) {
    return compose(
      header("🔒", "Khusus Owner"),
      "Perintah ini hanya untuk owner MyArisan.",
    );
  }

  const items = await loadItems();

  if (items.length === 0) {
    return compose(
      header("🛡️", "Bukti Paket"),
      "🎉 Tidak ada bukti paket yang menunggu dicek saat ini.",
    );
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
    return "👍 Selesai mengecek bukti paket.";
  }

  const data = state.data as OwnerReviewData;

  if (data.step === "select") {
    const choice = Number(trimmed.replace(/\D/g, ""));

    if (!Number.isInteger(choice) || choice < 1 || choice > data.items.length) {
      return `⚠️ Balas dengan nomor 1 sampai ${data.items.length}, atau ketik SELESAI untuk berhenti.`;
    }

    const selected = data.items[choice - 1];

    await setPendingAction(userId, "manage_owner_review", {
      ...data,
      selectedId: selected.id,
      step: "decide",
    } satisfies OwnerReviewData);

    return compose(
      header("🛡️", "Cek Bukti Paket", selected.arisanName),
      [
        field("💎", "Paket", `${selected.planName} · ${formatRupiah(selected.amount)}`),
        field("👤", "Admin", `${selected.adminName ?? "Admin"} (${selected.adminPhone})`),
      ].join("\n"),
      `🖼️ ${italic("Lihat bukti:")}\n${getAppUrl()}/owner`,
      footer("Balas TERIMA untuk aktifkan paket, atau TOLAK <alasan> untuk menolak."),
    );
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

    decisionText = `✅ ${bold(selected.arisanName)} — paket ${
      result.planName
    } aktif sampai ${formatDateTimeLabel(result.currentPeriodEnd)}.`;
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

    decisionText = `🚫 ${bold(selected.arisanName)} — bukti paket ditolak.`;
  } else {
    return "Balas *TERIMA* untuk aktifkan paket, atau *TOLAK <alasan>* untuk menolak.";
  }

  const remaining = await loadItems();

  if (remaining.length === 0) {
    await clearPendingAction(userId);
    return `${decisionText}\n\n🎉 Semua bukti paket sudah diproses.`;
  }

  await setPendingAction(userId, "manage_owner_review", {
    items: remaining,
    step: "select",
  } satisfies OwnerReviewData);

  return selectPrompt(remaining, decisionText);
}
