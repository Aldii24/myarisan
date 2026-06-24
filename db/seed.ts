import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { hashPin } from "../lib/auth/pin-core";
import { UNLIMITED_PROOF_LIMIT } from "../lib/plan-limits";
import {
  arisanGroups,
  memberships,
  periods,
  plans,
  subscriptions,
  usageCounters,
  users,
} from "./schema";

loadEnvConfig(process.cwd());

const planSeeds = [
  {
    featuresJson: {
      target: "coba-coba",
    },
    id: "free",
    maxMembers: 5,
    monthlyProofLimit: 50,
    name: "Free",
    price: 0,
  },
  {
    featuresJson: {
      target: "arisan kecil",
    },
    id: "basic",
    maxMembers: 15,
    monthlyProofLimit: UNLIMITED_PROOF_LIMIT,
    name: "Basic",
    price: 25000,
  },
  {
    featuresJson: {
      target: "arisan normal",
    },
    id: "pro",
    maxMembers: 30,
    monthlyProofLimit: UNLIMITED_PROOF_LIMIT,
    name: "Pro",
    price: 50000,
  },
  {
    featuresJson: {
      target: "arisan besar",
    },
    id: "premium",
    maxMembers: 75,
    monthlyProofLimit: UNLIMITED_PROOF_LIMIT,
    name: "Premium",
    price: 100000,
  },
];

function assertDevSeedAllowed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "true") {
    throw new Error(
      "Refusing to run dev seed in production. Set ALLOW_DEV_SEED=true only if you know this database is safe.",
    );
  }
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCurrentMonthPeriod() {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));

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

function getCurrentUsageMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function main() {
  try {
    assertDevSeedAllowed();

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required to seed development data.");
    }

    const db = drizzle(neon(databaseUrl));
    const now = new Date();
    const ownerPhone = process.env.DEV_OWNER_PHONE?.trim() || "6281111111111";
    const adminPhone = process.env.DEV_ADMIN_PHONE?.trim() || "6282222222222";
    const memberPhone = process.env.DEV_MEMBER_PHONE?.trim() || "6283333333333";
    const pinHash = await hashPin("1234");

    await db
      .insert(plans)
      .values(planSeeds)
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          featuresJson: sql`excluded.features_json`,
          maxAdmins: sql`excluded.max_admins`,
          maxGroups: sql`excluded.max_groups`,
          maxMembers: sql`excluded.max_members`,
          monthlyProofLimit: sql`excluded.monthly_proof_limit`,
          name: sql`excluded.name`,
          price: sql`excluded.price`,
          updatedAt: now,
        },
      });

    const upsertUser = async (phone: string, name: string) => {
      const [user] = await db
        .insert(users)
        .values({
          name,
          phone,
          pinHash,
        })
        .onConflictDoUpdate({
          target: users.phone,
          set: {
            name,
            pinHash,
            updatedAt: now,
          },
        })
        .returning();

      return user;
    };

    const ownerUser = await upsertUser(ownerPhone, "Owner MyArisan");
    const adminUser = await upsertUser(adminPhone, "Siti Aminah");
    const memberUser = await upsertUser(memberPhone, "Sinta");

    const [demoGroup] = await db
      .insert(arisanGroups)
      .values({
        adminUserId: adminUser.id,
        amountPerPeriod: 100000,
        bankAccountText: "BCA - Siti Aminah - 1234567890",
        dueDay: 10,
        joinCode: "ARSDEMO",
        name: "Arisan Demo RT 03",
        periodType: "monthly",
        status: "active",
      })
      .onConflictDoUpdate({
        target: arisanGroups.joinCode,
        set: {
          adminUserId: adminUser.id,
          amountPerPeriod: 100000,
          bankAccountText: "BCA - Siti Aminah - 1234567890",
          dueDay: 10,
          name: "Arisan Demo RT 03",
          periodType: "monthly",
          status: "active",
          updatedAt: now,
        },
      })
      .returning();

    const upsertMembership = async (input: {
      displayName: string;
      joinStatus: "claimed" | "invited";
      role: "admin" | "member";
      userId: string | null;
    }) => {
      await db
        .insert(memberships)
        .values({
          arisanGroupId: demoGroup.id,
          displayName: input.displayName,
          joinStatus: input.joinStatus,
          role: input.role,
          userId: input.userId,
        })
        .onConflictDoUpdate({
          target: [memberships.arisanGroupId, memberships.displayName],
          set: {
            joinStatus: input.joinStatus,
            role: input.role,
            updatedAt: now,
            userId: input.userId,
          },
        });
    };

    await upsertMembership({
      displayName: "Siti Aminah",
      joinStatus: "claimed",
      role: "admin",
      userId: adminUser.id,
    });
    await upsertMembership({
      displayName: "Sinta",
      joinStatus: "claimed",
      role: "member",
      userId: memberUser.id,
    });

    for (const displayName of ["Rina", "Dewi", "Fitri", "Agus"]) {
      await upsertMembership({
        displayName,
        joinStatus: "invited",
        role: "member",
        userId: null,
      });
    }

    const currentPeriod = getCurrentMonthPeriod();
    const [existingActivePeriod] = await db
      .select()
      .from(periods)
      .where(and(eq(periods.arisanGroupId, demoGroup.id), eq(periods.status, "active")))
      .limit(1);

    if (existingActivePeriod) {
      await db
        .update(periods)
        .set({
          dueDate: currentPeriod.dueDate,
          drawMemberId: null,
          name: currentPeriod.name,
          startDate: currentPeriod.startDate,
          status: "active",
          updatedAt: now,
        })
        .where(eq(periods.id, existingActivePeriod.id));
    } else {
      await db.insert(periods).values({
        arisanGroupId: demoGroup.id,
        dueDate: currentPeriod.dueDate,
        name: currentPeriod.name,
        startDate: currentPeriod.startDate,
        status: "active",
      });
    }

    await db
      .insert(subscriptions)
      .values({
        adminUserId: adminUser.id,
        arisanGroupId: demoGroup.id,
        currentPeriodEnd: addDays(now, 30),
        currentPeriodStart: now,
        planId: "basic",
        status: "active",
      })
      .onConflictDoUpdate({
        target: subscriptions.arisanGroupId,
        set: {
          adminUserId: adminUser.id,
          currentPeriodEnd: addDays(now, 30),
          currentPeriodStart: now,
          planId: "basic",
          status: "active",
          updatedAt: now,
        },
      });

    await db
      .insert(usageCounters)
      .values({
        arisanGroupId: demoGroup.id,
        month: getCurrentUsageMonth(now),
        proofLimit: 75,
        proofUsed: 0,
      })
      .onConflictDoUpdate({
        target: [usageCounters.arisanGroupId, usageCounters.month],
        set: {
          proofLimit: 75,
          proofUsed: 0,
          updatedAt: now,
        },
      });

    console.log("Seeded plans and development demo data.");
    console.log(`Owner login: ${ownerUser.phone} / PIN 1234`);
    console.log(`Admin login: ${adminUser.phone} / PIN 1234`);
    console.log(`Member login: ${memberUser.phone} / PIN 1234`);
    console.log("Demo join code: ARSDEMO");
  } catch (error) {
    console.error("Failed to seed development data.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    // Neon HTTP connections do not need explicit cleanup here.
  }
}

void main();
