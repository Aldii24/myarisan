import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups } from "@/db/schema";
import { formatRupiah } from "@/lib/arisan";
import {
  confirmPaymentById,
  expiredConfirmationMessage,
  getPendingPaymentsForArisan,
  rejectPaymentById,
} from "@/lib/payments/confirm-payment";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { bold, compose, footer, header } from "./format";

const cancelKeywords = new Set(["batal", "cancel", "selesai"]);

type KonfirmasiItem = {
  id: string;
  label: string;
  amount: number | null;
};

type KonfirmasiData = {
  step: "select" | "decide";
  arisanId: string;
  groupAmount: number;
  items: KonfirmasiItem[];
  selectedId?: string;
};

function buildItems(
  payments: Awaited<ReturnType<typeof getPendingPaymentsForArisan>>,
): KonfirmasiItem[] {
  return payments.map((payment) => ({
    amount: payment.amount,
    id: payment.id,
    label: `${payment.memberName ?? "Anggota"} - ${
      payment.amount ? formatRupiah(payment.amount) : "nominal belum terbaca"
    } (${payment.periodName})`,
  }));
}

function renderList(items: KonfirmasiItem[]) {
  return items
    .map((item, index) => `${index + 1}. ${item.label}`)
    .join("\n");
}

function selectPrompt(items: KonfirmasiItem[], prefix?: string) {
  return compose(
    prefix ?? null,
    header("✅", "Konfirmasi Bukti"),
    `Ada ${bold(`${items.length} bukti`)} menunggu dicek:`,
    renderList(items),
    footer("Balas NOMOR untuk memproses, atau SELESAI untuk berhenti."),
  );
}

async function getGroupAmount(arisanId: string) {
  const [group] = await db
    .select({ amountPerPeriod: arisanGroups.amountPerPeriod })
    .from(arisanGroups)
    .where(eq(arisanGroups.id, arisanId))
    .limit(1);

  return group?.amountPerPeriod ?? 0;
}

export async function beginKonfirmasi(
  userId: string,
  arisanId: string,
  arisanName: string,
) {
  const pending = await getPendingPaymentsForArisan(arisanId);

  if (pending.length === 0) {
    return compose(
      header("✅", "Konfirmasi Bukti", arisanName),
      "🎉 Tidak ada bukti yang menunggu dicek saat ini.",
    );
  }

  const items = buildItems(pending);

  await setPendingAction(userId, "confirm_payment", {
    arisanId,
    groupAmount: await getGroupAmount(arisanId),
    items,
    step: "select",
  } satisfies KonfirmasiData);

  return selectPrompt(items);
}

export async function handleKonfirmasiInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "👍 Konfirmasi bukti dihentikan.";
  }

  const data = state.data as KonfirmasiData;

  if (data.step === "select") {
    const choice = Number(trimmed.replace(/\D/g, ""));

    if (
      !Number.isInteger(choice) ||
      choice < 1 ||
      choice > data.items.length
    ) {
      return `⚠️ Balas dengan nomor 1 sampai ${data.items.length}, atau ketik SELESAI untuk berhenti.`;
    }

    const selected = data.items[choice - 1];

    await setPendingAction(userId, "confirm_payment", {
      ...data,
      selectedId: selected.id,
      step: "decide",
    } satisfies KonfirmasiData);

    return compose(
      header("✅", "Proses Bukti"),
      `🧾 ${bold(selected.label)}`,
      footer(
        "Balas TERIMA untuk konfirmasi · TERIMA <nominal> untuk ubah nominal · TOLAK untuk menolak.",
      ),
    );
  }

  // step === "decide"
  const selected = data.items.find((item) => item.id === data.selectedId);

  if (!selected) {
    await clearPendingAction(userId);
    return "Bukti tidak ditemukan lagi. Ketik KONFIRMASI untuk mulai lagi.";
  }

  let result: "confirmed" | "rejected" | null = null;

  if (normalized === "tolak") {
    const updated = await rejectPaymentById({
      actorUserId: userId,
      arisanId: data.arisanId,
      paymentId: selected.id,
    });
    result = updated ? "rejected" : null;
  } else if (normalized === "terima" || normalized.startsWith("terima ")) {
    const typedAmount = Number(normalized.slice("terima".length).replace(/\D/g, ""));
    const amount =
      Number.isInteger(typedAmount) && typedAmount > 0
        ? typedAmount
        : selected.amount ?? data.groupAmount;

    if (!amount || amount <= 0) {
      return "Nominal belum terbaca. Balas TERIMA <nominal>, contoh: TERIMA 100000.";
    }

    const confirmResult = await confirmPaymentById({
      actorUserId: userId,
      amount,
      arisanId: data.arisanId,
      paymentId: selected.id,
    });

    if (!confirmResult.ok && confirmResult.reason === "expired") {
      await clearPendingAction(userId);
      return expiredConfirmationMessage;
    }

    result = confirmResult.ok ? "confirmed" : null;
  } else {
    return "Balas TERIMA, TERIMA <nominal>, atau TOLAK.";
  }

  if (!result) {
    await clearPendingAction(userId);
    return "Bukti tidak ditemukan lagi. Ketik KONFIRMASI untuk mulai lagi.";
  }

  const decisionText =
    result === "confirmed"
      ? `✅ Pembayaran ${bold(selected.label)} dikonfirmasi.`
      : `🚫 Pembayaran ${bold(selected.label)} ditolak.`;
  const remaining = await getPendingPaymentsForArisan(data.arisanId);

  if (remaining.length === 0) {
    await clearPendingAction(userId);
    return `${decisionText}\n\n🎉 Semua bukti sudah diproses.`;
  }

  const items = buildItems(remaining);

  await setPendingAction(userId, "confirm_payment", {
    ...data,
    items,
    selectedId: undefined,
    step: "select",
  } satisfies KonfirmasiData);

  return selectPrompt(items, decisionText);
}
