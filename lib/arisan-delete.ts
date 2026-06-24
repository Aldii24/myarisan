import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { isSubscriptionActive } from "@/lib/subscription";

export type DeleteArisanResult =
  | { name: string; ok: true }
  | {
      code: "active_subscription" | "name_mismatch" | "not_admin" | "not_found";
      error: string;
      ok: false;
    };

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

// Permanently deletes an arisan and, via the schema's cascade rules, every row
// that belongs to it (memberships, periods, payments, invoices, usage counters,
// notifications). Guarded so an arisan with an active *paid* package can't be
// deleted — that would throw away paid time, so the admin is steered to start a
// new period instead. Shared by the dashboard action and the WhatsApp flow.
export async function deleteArisan(input: {
  actorUserId: string;
  arisanId: string;
  confirmationName: string;
}): Promise<DeleteArisanResult> {
  const [group] = await db
    .select({
      adminUserId: arisanGroups.adminUserId,
      amountPerPeriod: arisanGroups.amountPerPeriod,
      id: arisanGroups.id,
      joinCode: arisanGroups.joinCode,
      name: arisanGroups.name,
      periodType: arisanGroups.periodType,
      status: arisanGroups.status,
    })
    .from(arisanGroups)
    .where(eq(arisanGroups.id, input.arisanId))
    .limit(1);

  if (!group) {
    return { code: "not_found", error: "Arisan tidak ditemukan.", ok: false };
  }

  if (group.adminUserId !== input.actorUserId) {
    return {
      code: "not_admin",
      error: "Hanya admin arisan yang bisa menghapus arisan.",
      ok: false,
    };
  }

  // Backstop for the surface-level pre-checks: never delete an arisan whose paid
  // package is still active.
  if (await isSubscriptionActive(input.arisanId)) {
    return {
      code: "active_subscription",
      error:
        "Arisan ini masih punya paket aktif. Buat periode baru untuk memakai paketnya, jangan dihapus.",
      ok: false,
    };
  }

  if (normalizeName(input.confirmationName) !== normalizeName(group.name)) {
    return {
      code: "name_mismatch",
      error: `Nama tidak cocok. Ketik nama arisan persis: "${group.name}".`,
      ok: false,
    };
  }

  // Snapshot before deleting so the audit trail survives. The FK on
  // auditLogs.arisanGroupId is "set null", so the row persists after the cascade
  // while entityId keeps the deleted arisan's id.
  await createAuditLog({
    action: "arisan.delete",
    actorUserId: input.actorUserId,
    arisanGroupId: input.arisanId,
    beforeJson: {
      amountPerPeriod: group.amountPerPeriod,
      joinCode: group.joinCode,
      name: group.name,
      periodType: group.periodType,
      status: group.status,
    },
    entityId: input.arisanId,
    entityType: "arisan_group",
  });

  await db.delete(arisanGroups).where(eq(arisanGroups.id, input.arisanId));

  return { name: group.name, ok: true };
}
