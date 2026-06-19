import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups, periods } from "@/db/schema";
import { buildActivePeriod, getArisanDashboardData } from "@/lib/arisan";
import { createAuditLog } from "@/lib/audit";
import { isSubscriptionExpired } from "@/lib/subscription";

// Compute the next period's due date from the current one. Monthly advances to
// the same due day next month (dueDay is 1..28 so it never overflows a month);
// weekly advances 7 days. Falls back to `fromDate` only when there is no current
// period to anchor on (should not happen in normal use — every arisan starts
// with an active period).
export function computeNextDueDate(
  periodType: "weekly" | "monthly",
  currentDueDate: string | null,
  dueDay: number,
  fromDate: Date = new Date(),
): string {
  const base = currentDueDate
    ? new Date(`${currentDueDate}T00:00:00.000Z`)
    : fromDate;

  if (Number.isNaN(base.getTime())) {
    throw new Error("Tanggal periode tidak valid.");
  }

  if (periodType === "weekly") {
    const next = new Date(base);
    next.setUTCDate(next.getUTCDate() + 7);
    return next.toISOString().slice(0, 10);
  }

  const day = Math.min(Math.max(dueDay, 1), 28);
  const anchor = currentDueDate ? base : fromDate;
  const next = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, day),
  );

  return next.toISOString().slice(0, 10);
}

// Read-only summary used to build confirmation prompts on both the dashboard and
// the WhatsApp `periode` flow before a period is closed.
export async function getPeriodOverview(arisanId: string) {
  const dashboard = await getArisanDashboardData(arisanId);

  if (!dashboard) {
    return null;
  }

  const [pastRow] = await db
    .select({ value: count() })
    .from(periods)
    .where(
      and(eq(periods.arisanGroupId, arisanId), eq(periods.status, "closed")),
    );

  return {
    activePeriod: dashboard.activePeriod
      ? {
          dueDate: dashboard.activePeriod.dueDate,
          name: dashboard.activePeriod.name,
        }
      : null,
    drawMemberName: dashboard.drawMemberName,
    group: {
      name: dashboard.group.name,
      periodType: dashboard.group.periodType,
    },
    hasDrawWinner: Boolean(dashboard.drawMemberName),
    memberCount: dashboard.memberCount,
    paidCount: dashboard.paidCount,
    pastPeriodCount: pastRow?.value ?? 0,
    pendingCount: dashboard.pendingCount,
    unpaidCount: dashboard.unpaidMembers.length,
  };
}

export type StartNextPeriodResult =
  | {
      closedPeriodName: string | null;
      newPeriodId: string;
      newPeriodName: string;
      ok: true;
    }
  | { ok: false; reason: "expired" | "not_found" };

// Close the current active period and open the next one, keeping the invariant
// of exactly one active period per arisan. The closed period keeps its
// drawMemberId, which is what powers the giliran winner history. Gated when the
// paid subscription has lapsed (PRD §8.3 "Buat periode baru").
export async function startNextPeriod(input: {
  actorUserId: string;
  arisanId: string;
}): Promise<StartNextPeriodResult> {
  const [group] = await db
    .select({
      dueDay: arisanGroups.dueDay,
      periodType: arisanGroups.periodType,
    })
    .from(arisanGroups)
    .where(eq(arisanGroups.id, input.arisanId))
    .limit(1);

  if (!group) {
    return { ok: false, reason: "not_found" };
  }

  if (await isSubscriptionExpired(input.arisanId)) {
    return { ok: false, reason: "expired" };
  }

  const [activePeriod] = await db
    .select({
      dueDate: periods.dueDate,
      id: periods.id,
      name: periods.name,
    })
    .from(periods)
    .where(
      and(eq(periods.arisanGroupId, input.arisanId), eq(periods.status, "active")),
    )
    .limit(1);

  const nextDueDate = computeNextDueDate(
    group.periodType,
    activePeriod?.dueDate ?? null,
    group.dueDay ?? 1,
  );
  const nextPeriod = buildActivePeriod(group.periodType, nextDueDate);

  if (activePeriod) {
    await db
      .update(periods)
      .set({ status: "closed" })
      .where(eq(periods.id, activePeriod.id));
  }

  const [created] = await db
    .insert(periods)
    .values({
      arisanGroupId: input.arisanId,
      dueDate: nextPeriod.dueDate,
      name: nextPeriod.name,
      startDate: nextPeriod.startDate,
      status: "active",
    })
    .returning({ id: periods.id });

  await createAuditLog({
    action: "period.start_next",
    actorUserId: input.actorUserId,
    afterJson: { newPeriodId: created.id, newPeriodName: nextPeriod.name },
    arisanGroupId: input.arisanId,
    beforeJson: activePeriod
      ? { closedPeriodId: activePeriod.id, closedPeriodName: activePeriod.name }
      : {},
    entityId: created.id,
    entityType: "period",
  });

  return {
    closedPeriodName: activePeriod?.name ?? null,
    newPeriodId: created.id,
    newPeriodName: nextPeriod.name,
    ok: true,
  };
}
