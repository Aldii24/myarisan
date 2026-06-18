import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups, memberships, periods } from "@/db/schema";

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
