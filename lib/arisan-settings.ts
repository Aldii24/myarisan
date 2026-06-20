import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";

export type ArisanSettings = {
  amountPerPeriod: number;
  bankAccountText: string;
  dueDay: number;
  name: string;
  periodType: "weekly" | "monthly";
};

export type ArisanSettingsField =
  | "amountPerPeriod"
  | "bankAccountText"
  | "dueDay"
  | "name";

export type SettingsUpdateResult =
  | { ok: true; settings: ArisanSettings }
  | { error: string; ok: false };

export async function getArisanSettings(
  arisanId: string,
): Promise<ArisanSettings | null> {
  const [group] = await db
    .select({
      amountPerPeriod: arisanGroups.amountPerPeriod,
      bankAccountText: arisanGroups.bankAccountText,
      dueDay: arisanGroups.dueDay,
      name: arisanGroups.name,
      periodType: arisanGroups.periodType,
    })
    .from(arisanGroups)
    .where(eq(arisanGroups.id, arisanId))
    .limit(1);

  if (!group) {
    return null;
  }

  return {
    amountPerPeriod: group.amountPerPeriod,
    bankAccountText: group.bankAccountText ?? "",
    dueDay: group.dueDay ?? 1,
    name: group.name,
    periodType: group.periodType,
  };
}

// Validate a single field's raw input, returning the normalized value or an
// error message. Shared by the dashboard form and the per-field WhatsApp flow so
// both surfaces enforce identical rules.
export function validateSettingField(
  field: ArisanSettingsField,
  rawValue: string,
): { ok: true; value: string | number } | { error: string; ok: false } {
  if (field === "name") {
    const name = rawValue.trim();

    if (name.length < 3) {
      return { error: "Nama arisan minimal 3 karakter.", ok: false };
    }

    return { ok: true, value: name };
  }

  if (field === "amountPerPeriod") {
    const amount = Number(rawValue.replace(/\D/g, ""));

    if (!Number.isInteger(amount) || amount <= 0) {
      return { error: "Nominal setoran harus angka lebih dari 0.", ok: false };
    }

    return { ok: true, value: amount };
  }

  if (field === "dueDay") {
    const dueDay = Number(rawValue.replace(/\D/g, ""));

    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      return { error: "Batas setor harus angka 1 sampai 28.", ok: false };
    }

    return { ok: true, value: dueDay };
  }

  // bankAccountText
  const bankAccountText = rawValue.trim();

  if (!bankAccountText) {
    return { error: "Rekening admin tidak boleh kosong.", ok: false };
  }

  return { ok: true, value: bankAccountText };
}

type FieldChanges = Partial<Record<ArisanSettingsField, string | number>>;

function buildUpdatePayload(changes: FieldChanges) {
  const payload: {
    amountPerPeriod?: number;
    bankAccountText?: string;
    dueDay?: number;
    name?: string;
  } = {};

  if (changes.name !== undefined) {
    payload.name = String(changes.name);
  }

  if (changes.amountPerPeriod !== undefined) {
    payload.amountPerPeriod = Number(changes.amountPerPeriod);
  }

  if (changes.dueDay !== undefined) {
    payload.dueDay = Number(changes.dueDay);
  }

  if (changes.bankAccountText !== undefined) {
    payload.bankAccountText = String(changes.bankAccountText);
  }

  return payload;
}

async function persistFields(
  arisanId: string,
  actorUserId: string,
  changes: FieldChanges,
): Promise<SettingsUpdateResult> {
  const before = await getArisanSettings(arisanId);

  if (!before) {
    return { error: "Arisan tidak ditemukan.", ok: false };
  }

  await db
    .update(arisanGroups)
    .set(buildUpdatePayload(changes))
    .where(eq(arisanGroups.id, arisanId));

  await createAuditLog({
    action: "arisan.update_settings",
    actorUserId,
    afterJson: changes,
    arisanGroupId: arisanId,
    beforeJson: Object.fromEntries(
      Object.keys(changes).map((key) => [
        key,
        before[key as ArisanSettingsField],
      ]),
    ),
    entityId: arisanId,
    entityType: "arisan_group",
  });

  const settings = await getArisanSettings(arisanId);

  return settings
    ? { ok: true, settings }
    : { error: "Arisan tidak ditemukan.", ok: false };
}

// Update one field (used by the WhatsApp flow).
export async function updateArisanSettingField(input: {
  actorUserId: string;
  arisanId: string;
  field: ArisanSettingsField;
  rawValue: string;
}): Promise<SettingsUpdateResult> {
  const validation = validateSettingField(input.field, input.rawValue);

  if (!validation.ok) {
    return { error: validation.error, ok: false };
  }

  return persistFields(input.arisanId, input.actorUserId, {
    [input.field]: validation.value,
  });
}

// Update all editable fields at once (used by the dashboard form).
export async function updateArisanSettings(input: {
  actorUserId: string;
  arisanId: string;
  values: {
    amountPerPeriod: string;
    bankAccountText: string;
    dueDay: string;
    name: string;
  };
}): Promise<SettingsUpdateResult> {
  const fields: ArisanSettingsField[] = [
    "name",
    "amountPerPeriod",
    "dueDay",
    "bankAccountText",
  ];
  const changes: Partial<Record<ArisanSettingsField, string | number>> = {};

  for (const field of fields) {
    const validation = validateSettingField(field, input.values[field]);

    if (!validation.ok) {
      return { error: validation.error, ok: false };
    }

    changes[field] = validation.value;
  }

  return persistFields(input.arisanId, input.actorUserId, changes);
}
