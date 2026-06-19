"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/user";
import {
  getNotificationForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

// Derive the destination on the server from the notification itself, so the
// redirect target can never be tampered with through the form payload.
function notificationDestination(notification: {
  arisanGroupId: string | null;
  type: string;
}) {
  if (notification.type === "payment_proof" && notification.arisanGroupId) {
    return `/app/arisan/${notification.arisanGroupId}/payments`;
  }

  return "/app/notifications";
}

export async function markAllReadAction() {
  const user = await requireUser();

  await markAllNotificationsRead(user.id);
  revalidatePath("/app/notifications");
}

export async function markOneReadAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  if (id) {
    await markNotificationRead(id, user.id);
    revalidatePath("/app/notifications");
  }
}

export async function openNotificationAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const notification = id ? await getNotificationForUser(id, user.id) : null;

  if (!notification) {
    redirect("/app/notifications");
  }

  await markNotificationRead(notification.id, user.id);

  redirect(notificationDestination(notification));
}
