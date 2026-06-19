import "server-only";

import { randomInt } from "node:crypto";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups, memberships, periods } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";

export type GiliranMutationResult =
  | { ok: true }
  | { error: string; ok: false };

export type GiliranMember = {
  id: string;
  displayName: string;
  joinStatus: string;
  turnOrder: number | null;
  isCurrentDraw: boolean;
};

export type GiliranWinner = {
  periodId: string;
  periodName: string;
  status: string;
  dueDate: string;
  memberName: string;
};

export async function getGiliranData(arisanId: string) {
  const [group] = await db
    .select({ id: arisanGroups.id, name: arisanGroups.name })
    .from(arisanGroups)
    .where(eq(arisanGroups.id, arisanId))
    .limit(1);

  if (!group) {
    return null;
  }

  const [activePeriod] = await db
    .select({
      id: periods.id,
      name: periods.name,
      drawMemberId: periods.drawMemberId,
    })
    .from(periods)
    .where(and(eq(periods.arisanGroupId, arisanId), eq(periods.status, "active")))
    .limit(1);

  const memberRows = await db
    .select({
      id: memberships.id,
      displayName: memberships.displayName,
      joinStatus: memberships.joinStatus,
      turnOrder: memberships.turnOrder,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, arisanId),
        eq(memberships.role, "member"),
        ne(memberships.joinStatus, "removed"),
      ),
    )
    .orderBy(
      sql`${memberships.turnOrder} asc nulls last`,
      asc(memberships.displayName),
    );

  const members: GiliranMember[] = memberRows.map((member) => ({
    ...member,
    isCurrentDraw: Boolean(
      activePeriod?.drawMemberId && activePeriod.drawMemberId === member.id,
    ),
  }));

  const currentDrawName =
    members.find((member) => member.isCurrentDraw)?.displayName ?? null;

  return {
    group,
    activePeriod: activePeriod ?? null,
    currentDrawName,
    members,
  };
}

export async function getGiliranWinnerHistory(
  arisanId: string,
): Promise<GiliranWinner[]> {
  const rows = await db
    .select({
      periodId: periods.id,
      periodName: periods.name,
      status: periods.status,
      dueDate: periods.dueDate,
      memberName: memberships.displayName,
    })
    .from(periods)
    .innerJoin(memberships, eq(memberships.id, periods.drawMemberId))
    .where(eq(periods.arisanGroupId, arisanId))
    .orderBy(desc(periods.dueDate));

  return rows;
}

// --- Giliran mutations -----------------------------------------------------
// Shared by the dashboard server actions and the WhatsApp `giliran` flow, so
// turn ordering / draw-winner logic lives in one place (WhatsApp-first parity).

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

export async function reorderGiliranMember(input: {
  actorUserId: string;
  arisanId: string;
  direction: "down" | "up";
  membershipId: string;
}): Promise<GiliranMutationResult> {
  const orderedIds = await getOrderedMemberIds(input.arisanId);
  const index = orderedIds.indexOf(input.membershipId);

  if (index === -1) {
    return { error: "Anggota tidak ditemukan.", ok: false };
  }

  const swapWith = input.direction === "up" ? index - 1 : index + 1;

  if (swapWith < 0 || swapWith >= orderedIds.length) {
    return { error: "Urutan sudah di posisi paling ujung.", ok: false };
  }

  [orderedIds[index], orderedIds[swapWith]] = [
    orderedIds[swapWith],
    orderedIds[index],
  ];

  await persistOrder(orderedIds);

  await createAuditLog({
    action: "giliran.reorder",
    actorUserId: input.actorUserId,
    afterJson: {
      direction: input.direction,
      membershipId: input.membershipId,
      order: orderedIds,
    },
    arisanGroupId: input.arisanId,
    entityId: input.membershipId,
    entityType: "membership",
  });

  return { ok: true };
}

export async function randomizeGiliranOrder(input: {
  actorUserId: string;
  arisanId: string;
}): Promise<GiliranMutationResult> {
  const orderedIds = await getOrderedMemberIds(input.arisanId);

  if (orderedIds.length < 2) {
    return { error: "Minimal 2 anggota untuk mengacak giliran.", ok: false };
  }

  for (let index = orderedIds.length - 1; index > 0; index -= 1) {
    const swap = randomInt(0, index + 1);
    [orderedIds[index], orderedIds[swap]] = [orderedIds[swap], orderedIds[index]];
  }

  await persistOrder(orderedIds);

  await createAuditLog({
    action: "giliran.randomize",
    actorUserId: input.actorUserId,
    afterJson: { order: orderedIds },
    arisanGroupId: input.arisanId,
    entityId: input.arisanId,
    entityType: "period",
  });

  return { ok: true };
}

export async function setGiliranDrawMember(input: {
  actorUserId: string;
  arisanId: string;
  membershipId: string | null;
}): Promise<{ cleared: boolean; ok: true } | { error: string; ok: false }> {
  const [activePeriod] = await db
    .select({ id: periods.id, drawMemberId: periods.drawMemberId })
    .from(periods)
    .where(
      and(eq(periods.arisanGroupId, input.arisanId), eq(periods.status, "active")),
    )
    .limit(1);

  if (!activePeriod) {
    return { error: "Belum ada periode aktif untuk diatur gilirannya.", ok: false };
  }

  const drawMemberId = input.membershipId || null;

  if (drawMemberId) {
    const [member] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.id, drawMemberId),
          eq(memberships.arisanGroupId, input.arisanId),
          eq(memberships.role, "member"),
          ne(memberships.joinStatus, "removed"),
        ),
      )
      .limit(1);

    if (!member) {
      return { error: "Anggota tidak ditemukan di arisan ini.", ok: false };
    }
  }

  await db
    .update(periods)
    .set({ drawMemberId })
    .where(eq(periods.id, activePeriod.id));

  await createAuditLog({
    action: "giliran.set_draw_member",
    actorUserId: input.actorUserId,
    afterJson: { drawMemberId, periodId: activePeriod.id },
    arisanGroupId: input.arisanId,
    beforeJson: { drawMemberId: activePeriod.drawMemberId },
    entityId: activePeriod.id,
    entityType: "period",
  });

  return { cleared: !drawMemberId, ok: true };
}
