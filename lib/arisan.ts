import "server-only";

import { randomInt } from "node:crypto";
import { and, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  arisanGroups,
  memberships,
  payments,
  periods,
  plans,
  subscriptions,
} from "@/db/schema";
import { getPlanLimits as getSubscriptionPlanLimits } from "@/lib/subscription";

export const planMemberLimits: Record<string, number> = {
  free: 5,
  basic: 15,
  pro: 30,
  premium: 75,
};

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export function formatDateLabel(value: string | Date | null | undefined) {
  if (!value) {
    return "Belum ada";
  }

  const date = typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value;

  if (Number.isNaN(date.getTime())) {
    return "Belum ada";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeLabel(value: Date | null | undefined) {
  if (!value) {
    return "Belum ada";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

export function paymentStatusLabel(status: string | null | undefined) {
  if (status === "confirmed") {
    return "Sudah Bayar";
  }

  if (status === "pending" || status === "duplicate_check") {
    return "Menunggu Dicek";
  }

  if (status === "rejected") {
    return "Ditolak";
  }

  if (status === "partial") {
    return "Sebagian";
  }

  return "Belum Bayar";
}

export function getJoinShareText(joinCode: string) {
  return `Teman-teman, daftar MyArisan dulu ya.
Chat ke nomor MyArisan:
JOIN ${joinCode}
Pilih nama kamu dan buat PIN 4 angka.`;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

export function buildActivePeriod(periodType: "weekly" | "monthly", dueDateValue: string) {
  const dueDate = new Date(`${dueDateValue}T00:00:00.000Z`);

  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Tanggal jatuh tempo tidak valid.");
  }

  if (periodType === "weekly") {
    const startDate = getWeekStart(dueDate);

    return {
      dueDate: formatDate(dueDate),
      name: `Minggu ${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(startDate)}`,
      startDate: formatDate(startDate),
    };
  }

  const startDate = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), 1));

  return {
    dueDate: formatDate(dueDate),
    name: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(dueDate),
    startDate: formatDate(startDate),
  };
}

export async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `ARS${randomInt(10000, 100000)}`;
    const [existing] = await db
      .select({ id: arisanGroups.id })
      .from(arisanGroups)
      .where(eq(arisanGroups.joinCode, code))
      .limit(1);

    if (!existing) {
      return code;
    }
  }

  throw new Error("Gagal membuat kode join. Coba lagi.");
}

export async function getArisanDashboardData(arisanId: string) {
  const [group] = await db
    .select()
    .from(arisanGroups)
    .where(eq(arisanGroups.id, arisanId))
    .limit(1);

  if (!group) {
    return null;
  }

  const [activePeriod] = await db
    .select()
    .from(periods)
    .where(and(eq(periods.arisanGroupId, arisanId), eq(periods.status, "active")))
    .limit(1);

  const memberRows = await db
    .select({
      displayName: memberships.displayName,
      userId: memberships.userId,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, arisanId),
        eq(memberships.role, "member"),
        ne(memberships.joinStatus, "removed"),
      ),
    );

  const activePeriodPayments = activePeriod
    ? await db
        .select({
          amount: payments.amount,
          memberUserId: payments.memberUserId,
          status: payments.status,
        })
        .from(payments)
        .where(
          and(
            eq(payments.arisanGroupId, arisanId),
            eq(payments.periodId, activePeriod.id),
          ),
        )
    : [];
  const confirmedPayments = activePeriodPayments.filter(
    (payment) => payment.status === "confirmed",
  );
  const confirmedUserIds = new Set(
    confirmedPayments
      .map((payment) => payment.memberUserId)
      .filter((userId): userId is string => Boolean(userId)),
  );
  const unpaidMembers = memberRows
    .filter((member) => !member.userId || !confirmedUserIds.has(member.userId))
    .map((member) => member.displayName);
  const drawMember = activePeriod?.drawMemberId
    ? await db
        .select({ displayName: memberships.displayName })
        .from(memberships)
        .where(eq(memberships.id, activePeriod.drawMemberId))
        .limit(1)
    : [];

  return {
    activePeriod,
    drawMemberName: drawMember[0]?.displayName ?? null,
    group,
    memberCount: memberRows.length,
    paidCount: confirmedPayments.length,
    pendingCount: activePeriodPayments.filter((payment) => payment.status === "pending")
      .length,
    rejectedCount: activePeriodPayments.filter((payment) => payment.status === "rejected")
      .length,
    totalCollected: confirmedPayments.reduce(
      (total, payment) => total + (payment.amount ?? 0),
      0,
    ),
    unpaidMembers,
  };
}

export async function getPublicJoinData(joinCode: string) {
  const [group] = await db
    .select()
    .from(arisanGroups)
    .where(eq(arisanGroups.joinCode, joinCode.toUpperCase()))
    .limit(1);

  if (!group) {
    return null;
  }

  const unclaimedMembers = await db
    .select({
      displayName: memberships.displayName,
      id: memberships.id,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, group.id),
        eq(memberships.role, "member"),
        eq(memberships.joinStatus, "invited"),
        sql`${memberships.userId} is null`,
      ),
    )
    .orderBy(memberships.displayName);

  return {
    group,
    unclaimedMembers,
  };
}

export async function getMemberDashboardData(arisanId: string, userId: string) {
  const dashboard = await getArisanDashboardData(arisanId);

  if (!dashboard) {
    return null;
  }

  const paymentRows = dashboard.activePeriod
    ? await db
        .select({
          amount: payments.amount,
          confirmedAt: payments.confirmedAt,
          id: payments.id,
          proofImageUrl: payments.proofImageUrl,
          status: payments.status,
        })
        .from(payments)
        .where(
          and(
            eq(payments.arisanGroupId, arisanId),
            eq(payments.periodId, dashboard.activePeriod.id),
            eq(payments.memberUserId, userId),
          ),
        )
        .orderBy(desc(payments.createdAt))
        .limit(1)
    : [];

  return {
    ...dashboard,
    payment: paymentRows[0] ?? null,
    paymentStatus: paymentRows[0]?.status ?? null,
  };
}

export async function getMemberPaymentHistory(arisanId: string, userId: string) {
  const [group] = await db
    .select({
      amountPerPeriod: arisanGroups.amountPerPeriod,
      id: arisanGroups.id,
      name: arisanGroups.name,
    })
    .from(arisanGroups)
    .where(eq(arisanGroups.id, arisanId))
    .limit(1);

  if (!group) {
    return null;
  }

  const rows = await db
    .select({
      amount: payments.amount,
      confirmedAt: payments.confirmedAt,
      createdAt: payments.createdAt,
      id: payments.id,
      note: payments.note,
      periodDueDate: periods.dueDate,
      periodName: periods.name,
      proofImageUrl: payments.proofImageUrl,
      status: payments.status,
    })
    .from(payments)
    .innerJoin(periods, eq(periods.id, payments.periodId))
    .where(
      and(
        eq(payments.arisanGroupId, arisanId),
        eq(payments.memberUserId, userId),
      ),
    )
    .orderBy(desc(periods.dueDate), desc(payments.createdAt));

  const confirmed = rows.filter((row) => row.status === "confirmed");

  return {
    confirmedCount: confirmed.length,
    group,
    payments: rows,
    totalPaid: confirmed.reduce((total, row) => total + (row.amount ?? 0), 0),
  };
}

export async function getMemberPaymentUploadData(arisanId: string, userId: string) {
  const dashboard = await getMemberDashboardData(arisanId, userId);

  if (!dashboard) {
    return null;
  }

  return dashboard;
}

export async function getAdminPayments(arisanId: string) {
  return db
    .select({
      aiResultJson: payments.aiResultJson,
      amount: payments.amount,
      confirmedAt: payments.confirmedAt,
      createdAt: payments.createdAt,
      id: payments.id,
      memberName: memberships.displayName,
      note: payments.note,
      periodName: periods.name,
      proofImageUrl: payments.proofImageUrl,
      status: payments.status,
    })
    .from(payments)
    .innerJoin(periods, eq(periods.id, payments.periodId))
    .leftJoin(
      memberships,
      and(
        eq(memberships.arisanGroupId, payments.arisanGroupId),
        eq(memberships.userId, payments.memberUserId),
      ),
    )
    .where(eq(payments.arisanGroupId, arisanId))
    .orderBy(desc(payments.createdAt));
}

export async function getAdminPaymentDetail(arisanId: string, paymentId: string) {
  const [payment] = await db
    .select({
      aiResultJson: payments.aiResultJson,
      amount: payments.amount,
      confirmedAt: payments.confirmedAt,
      createdAt: payments.createdAt,
      id: payments.id,
      memberName: memberships.displayName,
      note: payments.note,
      ocrText: payments.ocrText,
      periodName: periods.name,
      proofImageUrl: payments.proofImageUrl,
      status: payments.status,
    })
    .from(payments)
    .innerJoin(periods, eq(periods.id, payments.periodId))
    .leftJoin(
      memberships,
      and(
        eq(memberships.arisanGroupId, payments.arisanGroupId),
        eq(memberships.userId, payments.memberUserId),
      ),
    )
    .where(and(eq(payments.arisanGroupId, arisanId), eq(payments.id, paymentId)))
    .limit(1);

  return payment ?? null;
}

export function buildRecapText(input: {
  arisanName: string;
  drawMemberName?: string | null;
  paidCount: number;
  pendingCount: number;
  periodName?: string | null;
  totalCollected: number;
  unpaidMembers: string[];
}) {
  const unpaidList =
    input.unpaidMembers.length > 0
      ? input.unpaidMembers.map((name) => `- ${name}`).join("\n")
      : "- Tidak ada";

  return `Rekap ${input.arisanName}
Periode: ${input.periodName ?? "Belum ada"}

Sudah bayar: ${input.paidCount}
Belum bayar: ${input.unpaidMembers.length}
Menunggu dicek: ${input.pendingCount}
Total terkumpul: ${formatRupiah(input.totalCollected)}

Belum bayar:
${unpaidList}

Giliran bulan ini:
${input.drawMemberName ?? "Belum diatur"}`;
}

export async function getArisanMembers(arisanId: string) {
  return db
    .select({
      displayName: memberships.displayName,
      id: memberships.id,
      joinStatus: memberships.joinStatus,
      role: memberships.role,
      userId: memberships.userId,
    })
    .from(memberships)
    .where(
      and(eq(memberships.arisanGroupId, arisanId), ne(memberships.joinStatus, "removed")),
    )
    .orderBy(memberships.role, memberships.displayName);
}

export async function getCurrentMemberLimit(arisanId: string) {
  const limits = await getSubscriptionPlanLimits(arisanId);

  return limits.maxMembers;
}

export async function attachFreePlanIfAvailable(arisanId: string, adminUserId: string) {
  const [freePlan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, "free"))
    .limit(1);

  if (!freePlan) {
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await db
    .insert(subscriptions)
    .values({
      adminUserId,
      arisanGroupId: arisanId,
      currentPeriodEnd: periodEnd,
      currentPeriodStart: now,
      planId: freePlan.id,
      status: "trial",
    })
    .onConflictDoNothing();
}
