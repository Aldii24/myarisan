"use server";

import { revalidatePath } from "next/cache";

import { requireArisanAdmin } from "@/lib/auth/user";
import {
  addMembersByNames,
  parseMemberNames,
  removeMember,
  renameMember,
} from "@/lib/members";

export type AddMembersState = {
  error?: string;
  success?: string;
};

export type MemberRowState = {
  error?: string;
  success?: string;
};

function revalidateMembers(arisanId: string) {
  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/members`);
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

  const names = parseMemberNames(String(formData.get("memberNames") ?? ""));

  const result = await addMembersByNames({
    actorUserId: context.user.id,
    arisanId,
    names,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMembers(arisanId);

  return { success: `${result.addedCount} anggota ditambahkan.` };
}

export async function renameMemberAction(
  arisanId: string,
  _state: MemberRowState,
  formData: FormData,
): Promise<MemberRowState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengubah anggota." };
  }

  const result = await renameMember({
    actorUserId: context.user.id,
    arisanId,
    membershipId: String(formData.get("membershipId") ?? ""),
    newName: String(formData.get("newName") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMembers(arisanId);

  return { success: "Nama anggota diperbarui." };
}

export async function removeMemberAction(
  arisanId: string,
  membershipId: string,
): Promise<MemberRowState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa menghapus anggota." };
  }

  const result = await removeMember({
    actorUserId: context.user.id,
    arisanId,
    membershipId,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMembers(arisanId);

  return { success: "Anggota dihapus." };
}
