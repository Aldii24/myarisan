"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { memberships } from "@/db/schema";
import { requireArisanAdmin } from "@/lib/auth/user";
import { canAddMember } from "@/lib/subscription";

export type AddMembersState = {
  error?: string;
  success?: string;
};

function parseMemberNames(value: FormDataEntryValue | null) {
  const seen = new Set<string>();
  const names: string[] = [];

  String(value ?? "")
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

export async function addMembersAction(
  arisanId: string,
  _state: AddMembersState,
  formData: FormData,
): Promise<AddMembersState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa menambah anggota." };
  }

  const names = parseMemberNames(formData.get("memberNames"));

  if (names.length === 0) {
    return { error: "Tulis minimal 1 nama anggota." };
  }

  const existingMemberships = await db
    .select({
      displayName: memberships.displayName,
      role: memberships.role,
    })
    .from(memberships)
    .where(
      and(eq(memberships.arisanGroupId, arisanId), ne(memberships.joinStatus, "removed")),
    );

  const existingNames = new Set(
    existingMemberships.map((member) => member.displayName.toLocaleLowerCase("id-ID")),
  );
  const duplicateNames = names.filter((name) =>
    existingNames.has(name.toLocaleLowerCase("id-ID")),
  );

  if (duplicateNames.length > 0) {
    return {
      error: `Nama sudah ada: ${duplicateNames.join(", ")}.`,
    };
  }

  const memberGate = await canAddMember(arisanId, names.length);

  if (!memberGate.allowed) {
    return {
      error: `Paket ${memberGate.planName} maksimal ${memberGate.limit} anggota. Kamu sudah punya ${memberGate.currentMemberCount} anggota.`,
    };
  }

  await db.insert(memberships).values(
    names.map((name) => ({
      arisanGroupId: arisanId,
      displayName: name,
      joinStatus: "invited" as const,
      role: "member" as const,
    })),
  );

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/members`);

  return {
    success: `${names.length} anggota ditambahkan.`,
  };
}
