"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteArisan } from "@/lib/arisan-delete";
import { updateArisanSettings } from "@/lib/arisan-settings";
import { requireArisanAdmin } from "@/lib/auth/user";

export type SettingsFormState = {
  error?: string;
  success?: string;
};

export type DeleteArisanState = {
  error?: string;
};

export async function updateArisanSettingsAction(
  arisanId: string,
  _state: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa mengubah pengaturan arisan." };
  }

  const result = await updateArisanSettings({
    actorUserId: context.user.id,
    arisanId,
    values: {
      amountPerPeriod: String(formData.get("amount") ?? ""),
      bankAccountText: String(formData.get("bankAccountText") ?? ""),
      dueDay: String(formData.get("dueDay") ?? ""),
      name: String(formData.get("name") ?? ""),
    },
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/pengaturan`);

  return { success: "Pengaturan arisan disimpan." };
}

export async function deleteArisanAction(
  arisanId: string,
  _state: DeleteArisanState,
  formData: FormData,
): Promise<DeleteArisanState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin yang bisa menghapus arisan." };
  }

  const result = await deleteArisan({
    actorUserId: context.user.id,
    arisanId,
    confirmationName: String(formData.get("confirmName") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  // redirect throws, so it must run outside the result-handling above.
  revalidatePath("/app");
  redirect("/app");
}
