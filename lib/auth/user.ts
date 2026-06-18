import "server-only";

import { and, eq, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { arisanGroups, memberships, users } from "@/db/schema";
import { getSessionUserId } from "@/lib/auth/session";

export function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("62")) {
    return digits;
  }

  return digits;
}

export function getPhoneLookupValues(phone: string) {
  const rawPhone = phone.trim();
  const normalizedPhone = normalizePhone(phone);
  const values = new Set<string>();

  if (rawPhone) {
    values.add(rawPhone);
  }

  if (normalizedPhone) {
    values.add(normalizedPhone);
    values.add(`+${normalizedPhone}`);
  }

  return Array.from(values);
}

export async function findUserForLogin(phone: string) {
  const lookupValues = getPhoneLookupValues(phone);

  if (lookupValues.length === 0) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(or(...lookupValues.map((phoneValue) => eq(users.phone, phoneValue))))
    .limit(1);

  return user ?? null;
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getUserMemberships(userId: string) {
  return db
    .select({
      id: memberships.id,
      arisanGroupId: memberships.arisanGroupId,
      role: memberships.role,
      displayName: memberships.displayName,
      arisanName: arisanGroups.name,
    })
    .from(memberships)
    .innerJoin(arisanGroups, eq(arisanGroups.id, memberships.arisanGroupId))
    .where(and(eq(memberships.userId, userId), ne(memberships.joinStatus, "removed")))
    .orderBy(arisanGroups.name);
}

export async function getMembershipForArisan(userId: string, arisanId: string) {
  const [membership] = await db
    .select({
      id: memberships.id,
      arisanGroupId: memberships.arisanGroupId,
      role: memberships.role,
      displayName: memberships.displayName,
      arisanName: arisanGroups.name,
    })
    .from(memberships)
    .innerJoin(arisanGroups, eq(arisanGroups.id, memberships.arisanGroupId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.arisanGroupId, arisanId),
        ne(memberships.joinStatus, "removed"),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function requireArisanMembership(arisanId: string) {
  const user = await requireUser();
  const membership = await getMembershipForArisan(user.id, arisanId);

  if (!membership) {
    redirect("/app/select-arisan");
  }

  return { user, membership };
}

export async function requireArisanAdmin(arisanId: string) {
  const context = await requireArisanMembership(arisanId);

  if (context.membership.role !== "admin") {
    return null;
  }

  return context;
}
