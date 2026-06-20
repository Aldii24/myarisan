import "server-only";

import { formatRupiah } from "@/lib/arisan";
import { getArisanSettings } from "@/lib/arisan-settings";
import {
  getManualPaymentMembers,
  recordManualPayment,
} from "@/lib/payments/manual-payment";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";

type RecordPaymentItem = {
  userId: string;
  displayName: string;
  alreadyPaid: boolean;
};

type RecordPaymentData = {
  arisanId: string;
  groupAmount: number;
  items: RecordPaymentItem[];
  step: "select" | "amount";
  selectedUserId?: string;
  selectedName?: string;
};

const cancelKeywords = new Set(["selesai", "batal", "cancel", "tidak", "no"]);

function renderList(items: RecordPaymentItem[]) {
  return items
    .map((item, index) => {
      const mark = item.alreadyPaid ? " (sudah bayar)" : "";
      return `${index + 1}. ${item.displayName}${mark}`;
    })
    .join("\n");
}

function selectPrompt(items: RecordPaymentItem[], prefix?: string) {
  const body = `Catat pembayaran manual
${renderList(items)}

Balas nomor anggota untuk catat pembayaran, atau SELESAI untuk berhenti.`;

  return [prefix, body].filter(Boolean).join("\n\n");
}

async function loadItems(arisanId: string): Promise<RecordPaymentItem[]> {
  const members = await getManualPaymentMembers(arisanId);

  return members.map((member) => ({
    alreadyPaid: member.alreadyPaid,
    displayName: member.displayName,
    userId: member.userId,
  }));
}

export async function beginCatatBayar(userId: string, arisanId: string) {
  const settings = await getArisanSettings(arisanId);

  if (!settings) {
    return "Data arisan tidak ditemukan.";
  }

  const items = await loadItems(arisanId);

  if (items.length === 0) {
    return `Belum ada anggota yang sudah bergabung di ${settings.name}.
Pembayaran manual hanya bisa untuk anggota yang sudah klaim nama lewat JOIN.`;
  }

  await setPendingAction(userId, "record_payment", {
    arisanId,
    groupAmount: settings.amountPerPeriod,
    items,
    step: "select",
  } satisfies RecordPaymentData);

  return selectPrompt(items);
}

export async function handleCatatBayarInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const data = state.data as RecordPaymentData;
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "Selesai mencatat pembayaran.";
  }

  if (data.step === "amount") {
    if (!data.selectedUserId || !data.selectedName) {
      await setPendingAction(userId, "record_payment", {
        ...data,
        selectedName: undefined,
        selectedUserId: undefined,
        step: "select",
      } satisfies RecordPaymentData);

      return selectPrompt(data.items);
    }

    const amount =
      normalized === "ok" || normalized === ""
        ? data.groupAmount
        : Number(trimmed.replace(/\D/g, ""));

    const result = await recordManualPayment({
      actorUserId: userId,
      amount,
      arisanId: data.arisanId,
      memberUserId: data.selectedUserId,
    });

    if (!result.ok) {
      return result.error;
    }

    const confirmation = `Pembayaran ${result.memberDisplayName} untuk ${
      result.periodName
    } dicatat ✅ (${formatRupiah(result.amount)}).`;

    const items = await loadItems(data.arisanId);
    const remaining = items.filter((item) => !item.alreadyPaid);

    if (remaining.length === 0) {
      await clearPendingAction(userId);
      return `${confirmation}
Semua anggota sudah tercatat untuk periode ini.`;
    }

    await setPendingAction(userId, "record_payment", {
      ...data,
      items,
      selectedName: undefined,
      selectedUserId: undefined,
      step: "select",
    } satisfies RecordPaymentData);

    return selectPrompt(items, confirmation);
  }

  // step === "select"
  const choice = Number(trimmed.replace(/\D/g, ""));

  if (!Number.isInteger(choice) || choice < 1 || choice > data.items.length) {
    return `Balas dengan nomor 1 sampai ${data.items.length}, atau ketik SELESAI untuk berhenti.`;
  }

  const selected = data.items[choice - 1];

  await setPendingAction(userId, "record_payment", {
    ...data,
    selectedName: selected.displayName,
    selectedUserId: selected.userId,
    step: "amount",
  } satisfies RecordPaymentData);

  return `Nominal pembayaran ${selected.displayName}?
Balas angka (contoh: 100000), atau ketik OK untuk pakai ${formatRupiah(
    data.groupAmount,
  )}.`;
}
