"use server";

import { randomInt } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { memberships, periods } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { requireArisanAdmin } from "@/lib/auth/user";

export type GiliranActionState = {
  error?: string;
  success?: string;
};

async function getOrderedMemberIds(arisanId: string) {
  const rows = await db
    .select({
      id: memberships.id,
      displayName: memberships.displayName,
      turnOrder: memberships.turnOrder,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, arisanId),
        eq(memberships.role, "member"),
        ne(memberships.joinStatus, "removed"),
      ),
    );

  return rows
    .sort((a, b) => {
      if (a.turnOrder !== null && b.turnOrder !== null) {
        return a.turnOrder - b.turnOrder;
      }

      if (a.turnOrder !== null) {
        return -1;
      }

      if (b.turnOrder !== null) {
        return 1;
      }

      return a.displayName.localeCompare(b.displayName, "id-ID");
    })
    .map((row) => row.id);
}

async function persistOrder(orderedIds: string[]) {
  for (let index = 0; index < orderedIds.length; index += 1) {
    await db
      .update(memberships)
      .set({ turnOrder: index + 1 })
      .where(eq(memberships.id, orderedIds[index]));
  }
}

function revalidateGiliran(arisanId: string) {
  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/giliran`);
}

export async function moveMemberOrderAction(
  arisanId: string,
  membershipId: string,
  direction: "down" | "up",
): Promise<GiliranActionState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengatur giliran." };
  }

  const orderedIds = await getOrderedMemberIds(arisanId);
  const index = orderedIds.indexOf(membershipId);

  if (index === -1) {
    return { error: "Anggota tidak ditemukan." };
  }

  const swapWith = direction === "up" ? index - 1 : index + 1;

  if (swapWith < 0 || swapWith >= orderedIds.length) {
    return { error: "Urutan sudah di posisi paling ujung." };
  }

  [orderedIds[index], orderedIds[swapWith]] = [
    orderedIds[swapWith],
    orderedIds[index],
  ];

  await persistOrder(orderedIds);

  await createAuditLog({
    action: "giliran.reorder",
    actorUserId: context.user.id,
    afterJson: { direction, membershipId, order: orderedIds },
    arisanGroupId: arisanId,
    entityId: membershipId,
    entityType: "membership",
  });

  revalidateGiliran(arisanId);

  return { success: "Urutan giliran diperbarui." };
}

export async function randomizeOrderAction(
  arisanId: string,
): Promise<GiliranActionState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengatur giliran." };
  }

  const orderedIds = await getOrderedMemberIds(arisanId);

  if (orderedIds.length < 2) {
    return { error: "Minimal 2 anggota untuk mengacak giliran." };
  }

  for (let index = orderedIds.length - 1; index > 0; index -= 1) {
    const swap = randomInt(0, index + 1);
    [orderedIds[index], orderedIds[swap]] = [orderedIds[swap], orderedIds[index]];
  }

  await persistOrder(orderedIds);

  await createAuditLog({
    action: "giliran.randomize",
    actorUserId: context.user.id,
    afterJson: { order: orderedIds },
    arisanGroupId: arisanId,
    entityId: arisanId,
    entityType: "period",
  });

  revalidateGiliran(arisanId);

  return { success: "Giliran berhasil diacak." };
}

export async function setDrawMemberAction(
  arisanId: string,
  _state: GiliranActionState,
  formData: FormData,
): Promise<GiliranActionState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengatur giliran." };
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();

  const [activePeriod] = await db
    .select({ id: periods.id, drawMemberId: periods.drawMemberId })
    .from(periods)
    .where(and(eq(periods.arisanGroupId, arisanId), eq(periods.status, "active")))
    .limit(1);

  if (!activePeriod) {
    return { error: "Belum ada periode aktif untuk diatur gilirannya." };
  }

  const drawMemberId = membershipId || null;

  if (drawMemberId) {
    const [member] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.id, drawMemberId),
          eq(memberships.arisanGroupId, arisanId),
          eq(memberships.role, "member"),
          ne(memberships.joinStatus, "removed"),
        ),
      )
      .limit(1);

    if (!member) {
      return { error: "Anggota tidak ditemukan di arisan ini." };
    }
  }

  await db
    .update(periods)
    .set({ drawMemberId })
    .where(eq(periods.id, activePeriod.id));

  await createAuditLog({
    action: "giliran.set_draw_member",
    actorUserId: context.user.id,
    afterJson: { drawMemberId, periodId: activePeriod.id },
    arisanGroupId: arisanId,
    beforeJson: { drawMemberId: activePeriod.drawMemberId },
    entityId: activePeriod.id,
    entityType: "period",
  });

  revalidateGiliran(arisanId);

  return {
    success: drawMemberId ? "Giliran bulan ini diperbarui." : "Giliran dikosongkan.",
  };
}
