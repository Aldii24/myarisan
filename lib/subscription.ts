import "server-only";

import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  memberships,
  plans,
  subscriptions,
  usageCounters,
  type Plan,
  type Subscription,
} from "@/db/schema";

export const defaultPlanLimits = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    maxMembers: 5,
    monthlyProofLimit: 10,
  },
  basic: {
    id: "basic",
    name: "Basic",
    price: 25000,
    maxMembers: 15,
    monthlyProofLimit: 75,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 50000,
    maxMembers: 30,
    monthlyProofLimit: 150,
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 100000,
    maxMembers: 75,
    monthlyProofLimit: 375,
  },
} satisfies Record<string, Pick<Plan, "id" | "maxMembers" | "monthlyProofLimit" | "name" | "price">>;

const paidPlanIds = ["basic", "pro", "premium"] as const;

type PlanLike = Pick<
  Plan,
  "id" | "maxMembers" | "monthlyProofLimit" | "name" | "price"
>;

type SubscriptionWithPlan = Subscription & {
  plan: PlanLike;
};

export function getCurrentUsageMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function isPaidPlan(planId: string) {
  return planId !== "free";
}

function isActivePaidSubscription(subscription: SubscriptionWithPlan | null) {
  if (!subscription || !isPaidPlan(subscription.planId)) {
    return false;
  }

  return (
    subscription.status === "active" &&
    Boolean(subscription.currentPeriodEnd) &&
    subscription.currentPeriodEnd! > new Date()
  );
}

async function getSubscriptionWithPlan(arisanId: string) {
  const [row] = await db
    .select({
      subscription: subscriptions,
      plan: {
        id: plans.id,
        maxMembers: plans.maxMembers,
        monthlyProofLimit: plans.monthlyProofLimit,
        name: plans.name,
        price: plans.price,
      },
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.arisanGroupId, arisanId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row.subscription,
    plan: row.plan,
  };
}

async function getFreePlan(): Promise<PlanLike> {
  const [freePlan] = await db
    .select({
      id: plans.id,
      maxMembers: plans.maxMembers,
      monthlyProofLimit: plans.monthlyProofLimit,
      name: plans.name,
      price: plans.price,
    })
    .from(plans)
    .where(eq(plans.id, "free"))
    .limit(1);

  return freePlan ?? defaultPlanLimits.free;
}

export async function getPaidPlans() {
  const rows = await db
    .select({
      id: plans.id,
      maxMembers: plans.maxMembers,
      monthlyProofLimit: plans.monthlyProofLimit,
      name: plans.name,
      price: plans.price,
    })
    .from(plans)
    .where(inArray(plans.id, [...paidPlanIds]))
    .orderBy(plans.price);

  return rows.length > 0
    ? rows
    : paidPlanIds.map((planId) => defaultPlanLimits[planId]);
}

export async function getPlanById(planId: string) {
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);

  return plan ?? null;
}

export async function getActiveSubscription(arisanId: string) {
  const subscription = await getSubscriptionWithPlan(arisanId);

  return isActivePaidSubscription(subscription) ? subscription : null;
}

export async function getCurrentPlan(arisanId: string) {
  const activeSubscription = await getActiveSubscription(arisanId);

  return activeSubscription?.plan ?? (await getFreePlan());
}

export async function getPlanLimits(arisanId: string) {
  const plan = await getCurrentPlan(arisanId);

  return {
    maxMembers: plan.maxMembers,
    planId: plan.id,
    planName: plan.name,
    proofLimit: plan.monthlyProofLimit,
  };
}

export async function isSubscriptionActive(arisanId: string) {
  return Boolean(await getActiveSubscription(arisanId));
}

export async function getMemberUsage(arisanId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, arisanId),
        eq(memberships.role, "member"),
        ne(memberships.joinStatus, "removed"),
      ),
    );

  return row?.value ?? 0;
}

export async function canAddMember(arisanId: string, namesToAdd = 1) {
  const [limits, memberCount] = await Promise.all([
    getPlanLimits(arisanId),
    getMemberUsage(arisanId),
  ]);

  return {
    allowed: memberCount + namesToAdd <= limits.maxMembers,
    currentMemberCount: memberCount,
    limit: limits.maxMembers,
    planName: limits.planName,
  };
}

export async function getUsageCounter(arisanId: string, proofLimit?: number) {
  const month = getCurrentUsageMonth();
  const limit = proofLimit ?? (await getPlanLimits(arisanId)).proofLimit;

  await db
    .insert(usageCounters)
    .values({
      arisanGroupId: arisanId,
      month,
      proofLimit: limit,
      proofUsed: 0,
    })
    .onConflictDoUpdate({
      target: [usageCounters.arisanGroupId, usageCounters.month],
      set: {
        proofLimit: limit,
        updatedAt: new Date(),
      },
    });

  const [counter] = await db
    .select()
    .from(usageCounters)
    .where(and(eq(usageCounters.arisanGroupId, arisanId), eq(usageCounters.month, month)))
    .limit(1);

  return counter;
}

export async function incrementProofUsage(arisanId: string) {
  const { proofLimit } = await getPlanLimits(arisanId);
  const month = getCurrentUsageMonth();

  await db
    .insert(usageCounters)
    .values({
      arisanGroupId: arisanId,
      month,
      proofLimit,
      proofUsed: 1,
    })
    .onConflictDoUpdate({
      target: [usageCounters.arisanGroupId, usageCounters.month],
      set: {
        proofLimit,
        proofUsed: sql`${usageCounters.proofUsed} + 1`,
        updatedAt: new Date(),
      },
    });
}

export async function canUseAutomaticProof(arisanId: string) {
  const latestSubscription = await getSubscriptionWithPlan(arisanId);

  if (
    latestSubscription &&
    isPaidPlan(latestSubscription.planId) &&
    !isActivePaidSubscription(latestSubscription)
  ) {
    return {
      allowed: false,
      limit: latestSubscription.plan.monthlyProofLimit,
      reason: "expired" as const,
      used: 0,
    };
  }

  const limits = await getPlanLimits(arisanId);
  const counter = await getUsageCounter(arisanId, limits.proofLimit);
  const used = counter?.proofUsed ?? 0;

  if (used >= limits.proofLimit) {
    return {
      allowed: false,
      limit: limits.proofLimit,
      reason: "quota" as const,
      used,
    };
  }

  return {
    allowed: true,
    limit: limits.proofLimit,
    reason: null,
    used,
  };
}

export async function getPackageStatus(arisanId: string) {
  const [latestSubscription, effectivePlan, memberCount] = await Promise.all([
    getSubscriptionWithPlan(arisanId),
    getCurrentPlan(arisanId),
    getMemberUsage(arisanId),
  ]);
  const status =
    latestSubscription &&
    isPaidPlan(latestSubscription.planId) &&
    !isActivePaidSubscription(latestSubscription)
      ? "expired"
      : isActivePaidSubscription(latestSubscription)
        ? "aktif"
        : "gratis";
  const counter = await getUsageCounter(arisanId, effectivePlan.monthlyProofLimit);
  const activeUntil =
    status === "aktif" ? latestSubscription?.currentPeriodEnd ?? null : null;
  const daysUntilExpiry = activeUntil
    ? Math.ceil((activeUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    activeUntil,
    currentPlan: effectivePlan,
    daysUntilExpiry,
    isExpiredPaid: status === "expired",
    isNearExpiry:
      status === "aktif" && daysUntilExpiry !== null && daysUntilExpiry <= 3,
    latestSubscription,
    memberLimit: effectivePlan.maxMembers,
    memberUsed: memberCount,
    proofLimit: effectivePlan.monthlyProofLimit,
    proofUsed: counter?.proofUsed ?? 0,
    status,
  };
}
