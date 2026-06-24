import "server-only";

import { formatRupiah } from "@/lib/arisan";
import {
  getArisanSettings,
  updateArisanSettingField,
  type ArisanSettingsField,
} from "@/lib/arisan-settings";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { compose, footer, header } from "./format";

type SettingsData = {
  arisanId: string;
  field?: ArisanSettingsField;
  step: "menu" | "value";
};

const cancelKeywords = new Set(["selesai", "batal", "cancel", "tidak", "no"]);

const fieldByNumber: Record<string, { field: ArisanSettingsField; prompt: string }> = {
  "1": { field: "name", prompt: "Kirim nama arisan yang baru." },
  "2": {
    field: "amountPerPeriod",
    prompt: "Kirim nominal setoran baru (angka saja, contoh: 100000).",
  },
  "3": {
    field: "dueDay",
    prompt: "Kirim tanggal batas setor baru (angka 1-28).",
  },
  "4": {
    field: "bankAccountText",
    prompt: "Kirim rekening admin baru (bank, nama, nomor).",
  },
};

async function renderMenu(userId: string, arisanId: string, prefix?: string) {
  const settings = await getArisanSettings(arisanId);

  if (!settings) {
    await clearPendingAction(userId);
    return "Data arisan tidak ditemukan.";
  }

  await setPendingAction(userId, "manage_settings", {
    arisanId,
    step: "menu",
  } satisfies SettingsData);

  const body = `1️⃣ Nama: *${settings.name}*
2️⃣ Setoran: *${formatRupiah(settings.amountPerPeriod)}*
3️⃣ Batas setor: *tanggal ${settings.dueDay}*
4️⃣ Rekening: *${settings.bankAccountText || "Belum diisi"}*`;

  return compose(
    prefix ? `✅ ${prefix}` : null,
    header("⚙️", "Pengaturan", settings.name),
    body,
    footer("Balas nomor (1-4) untuk mengubah, atau SELESAI untuk berhenti."),
  );
}

export async function beginPengaturan(userId: string, arisanId: string) {
  return renderMenu(userId, arisanId);
}

export async function handlePengaturanInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const data = state.data as SettingsData;
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "👍 Selesai mengubah pengaturan.";
  }

  if (data.step === "value") {
    if (!data.field) {
      return renderMenu(userId, data.arisanId);
    }

    const result = await updateArisanSettingField({
      actorUserId: userId,
      arisanId: data.arisanId,
      field: data.field,
      rawValue: trimmed,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderMenu(userId, data.arisanId, "Pengaturan disimpan.");
  }

  // step === "menu"
  const choice = fieldByNumber[normalized];

  if (!choice) {
    return "⚠️ Balas nomor 1 sampai 4 untuk memilih yang mau diubah, atau SELESAI.";
  }

  await setPendingAction(userId, "manage_settings", {
    arisanId: data.arisanId,
    field: choice.field,
    step: "value",
  } satisfies SettingsData);

  return choice.prompt;
}
