import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { memberships } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { canAddMember } from "@/lib/subscription";

export type MemberMutationResult =
  | { ok: true }
  | { error: string; ok: false };

// Split a pasted block of names into a clean, de-duplicated list (case-insensitive).
export function parseMemberNames(value: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean)
    .forEach((name) => {
      const key = name.toLocaleLowerCase("id-ID");

      if (!seen.has(key)) {
        seen.add(key);
        names.push(name);
      }
    });

  return names;
}

// Add members by name. Names matching a previously removed member reactivate
// that row instead of inserting a duplicate (the (group, display_name) unique
// index covers removed rows too). Enforces the plan member limit.
export async function addMembersByNames(input: {
  actorUserId: string;
  arisanId: string;
  names: string[];
}): Promise<{ addedCount: number; ok: true } | { error: string; ok: false }> {
  if (input.names.length === 0) {
    return { error: "Tulis minimal 1 nama anggota.", ok: false };
  }

  const allMemberships = await db
    .select({
      displayName: memberships.displayName,
      id: memberships.id,
      joinStatus: memberships.joinStatus,
      userId: memberships.userId,
    })
    .from(memberships)
    .where(eq(memberships.arisanGroupId, input.arisanId));

  const activeByName = new Map<string, (typeof allMemberships)[number]>();
  const removedByName = new Map<string, (typeof allMemberships)[number]>();

  for (const member of allMemberships) {
    const key = member.displayName.toLocaleLowerCase("id-ID");

    if (member.joinStatus === "removed") {
      removedByName.set(key, member);
    } else {
      activeByName.set(key, member);
    }
  }

  const duplicates: string[] = [];
  const toReactivate: Array<{ id: string; userId: string | null }> = [];
  const toInsert: string[] = [];

  for (const name of input.names) {
    const key = name.toLocaleLowerCase("id-ID");

    if (activeByName.has(key)) {
      duplicates.push(name);
    } else if (removedByName.has(key)) {
      const removed = removedByName.get(key)!;
      toReactivate.push({ id: removed.id, userId: removed.userId });
    } else {
      toInsert.push(name);
    }
  }

  if (duplicates.length > 0) {
    return { error: `Nama sudah ada: ${duplicates.join(", ")}.`, ok: false };
  }

  const addCount = toReactivate.length + toInsert.length;
  const gate = await canAddMember(input.arisanId, addCount);

  if (!gate.allowed) {
    return {
      error: `Paket ${gate.planName} maksimal ${gate.limit} anggota. Kamu sudah punya ${gate.currentMemberCount} anggota.`,
      ok: false,
    };
  }

  for (const member of toReactivate) {
    await db
      .update(memberships)
      .set({ joinStatus: member.userId ? "claimed" : "invited" })
      .where(eq(memberships.id, member.id));
  }

  if (toInsert.length > 0) {
    await db.insert(memberships).values(
      toInsert.map((name) => ({
        arisanGroupId: input.arisanId,
        displayName: name,
        joinStatus: "invited" as const,
        role: "member" as const,
      })),
    );
  }

  await createAuditLog({
    action: "member.add",
    actorUserId: input.actorUserId,
    afterJson: { inserted: toInsert, reactivated: toReactivate.map((m) => m.id) },
    arisanGroupId: input.arisanId,
    entityId: input.arisanId,
    entityType: "membership",
  });

  return { addedCount: addCount, ok: true };
}

async function getManageableMember(arisanId: string, membershipId: string) {
  const [member] = await db
    .select({
      displayName: memberships.displayName,
      id: memberships.id,
      role: memberships.role,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.id, membershipId),
        eq(memberships.arisanGroupId, arisanId),
        ne(memberships.joinStatus, "removed"),
      ),
    )
    .limit(1);

  return member ?? null;
}

export async function renameMember(input: {
  actorUserId: string;
  arisanId: string;
  membershipId: string;
  newName: string;
}): Promise<MemberMutationResult> {
  const newName = input.newName.trim();

  if (!newName) {
    return { error: "Nama anggota tidak boleh kosong.", ok: false };
  }

  const member = await getManageableMember(input.arisanId, input.membershipId);

  if (!member) {
    return { error: "Anggota tidak ditemukan.", ok: false };
  }

  if (member.role === "admin") {
    return { error: "Nama admin tidak bisa diubah dari sini.", ok: false };
  }

  // Check against ALL rows (including removed) to avoid colliding with the
  // (group, display_name) unique index.
  const groupMembers = await db
    .select({ displayName: memberships.displayName, id: memberships.id })
    .from(memberships)
    .where(eq(memberships.arisanGroupId, input.arisanId));

  const clash = groupMembers.some(
    (other) =>
      other.id !== member.id &&
      other.displayName.toLocaleLowerCase("id-ID") ===
        newName.toLocaleLowerCase("id-ID"),
  );

  if (clash) {
    return { error: `Nama "${newName}" sudah dipakai di arisan ini.`, ok: false };
  }

  await db
    .update(memberships)
    .set({ displayName: newName })
    .where(eq(memberships.id, member.id));

  await createAuditLog({
    action: "member.rename",
    actorUserId: input.actorUserId,
    afterJson: { displayName: newName },
    arisanGroupId: input.arisanId,
    beforeJson: { displayName: member.displayName },
    entityId: member.id,
    entityType: "membership",
  });

  return { ok: true };
}

export async function removeMember(input: {
  actorUserId: string;
  arisanId: string;
  membershipId: string;
}): Promise<MemberMutationResult> {
  const member = await getManageableMember(input.arisanId, input.membershipId);

  if (!member) {
    return { error: "Anggota tidak ditemukan.", ok: false };
  }

  if (member.role === "admin") {
    return { error: "Admin arisan tidak bisa dihapus.", ok: false };
  }

  await db
    .update(memberships)
    .set({ joinStatus: "removed", turnOrder: null })
    .where(eq(memberships.id, member.id));

  await createAuditLog({
    action: "member.remove",
    actorUserId: input.actorUserId,
    arisanGroupId: input.arisanId,
    beforeJson: { displayName: member.displayName },
    entityId: member.id,
    entityType: "membership",
  });

  return { ok: true };
}
