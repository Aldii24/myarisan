"use server";

import { revalidatePath } from "next/cache";

import { requireArisanAdmin } from "@/lib/auth/user";
import {
  randomizeGiliranOrder,
  reorderGiliranMember,
  setGiliranDrawMember,
} from "@/lib/giliran";
import { startNextPeriod } from "@/lib/periods";

export type GiliranActionState = {
  error?: string;
  success?: string;
};

function revalidateGiliran(arisanId: string) {
  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/giliran`);
}

export async function moveMemberOrderAction(
  arisanId: string,
  membershipId: string,
  direction: "down" | "up",
): Promise<GiliranActionState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengatur giliran." };
  }

  const result = await reorderGiliranMember({
    actorUserId: context.user.id,
    arisanId,
    direction,
    membershipId,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateGiliran(arisanId);

  return { success: "Urutan giliran diperbarui." };
}

export async function randomizeOrderAction(
  arisanId: string,
): Promise<GiliranActionState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengatur giliran." };
  }

  const result = await randomizeGiliranOrder({
    actorUserId: context.user.id,
    arisanId,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateGiliran(arisanId);

  return { success: "Giliran berhasil diacak." };
}

export async function startNextPeriodAction(
  arisanId: string,
): Promise<GiliranActionState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengatur periode." };
  }

  const result = await startNextPeriod({
    actorUserId: context.user.id,
    arisanId,
  });

  if (!result.ok) {
    if (result.reason === "expired") {
      return {
        error:
          "Paket arisan sudah berakhir. Perpanjang paket untuk membuka periode baru.",
      };
    }

    return { error: "Arisan tidak ditemukan." };
  }

  revalidateGiliran(arisanId);
  revalidatePath(`/app/arisan/${arisanId}/payments`);

  return {
    success: result.closedPeriodName
      ? `Periode ${result.closedPeriodName} ditutup. Periode baru ${result.newPeriodName} dimulai.`
      : `Periode baru ${result.newPeriodName} dimulai.`,
  };
}

export async function setDrawMemberAction(
  arisanId: string,
  _state: GiliranActionState,
  formData: FormData,
): Promise<GiliranActionState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengatur giliran." };
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();

  const result = await setGiliranDrawMember({
    actorUserId: context.user.id,
    arisanId,
    membershipId: membershipId || null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateGiliran(arisanId);

  return {
    success: result.cleared
      ? "Giliran dikosongkan."
      : "Giliran bulan ini diperbarui.",
  };
}
