import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export type PendingAction = "reset_pin";

// How long a started flow stays open before a later, unrelated message could be
// misread as flow input. Keeps "reset pin" from silently capturing a PIN typed
// hours later.
const pendingActionTtlMs = 15 * 60 * 1000;

export async function getPendingAction(
  userId: string,
): Promise<PendingAction | null> {
  const [user] = await db
    .select({
      pendingAction: users.pendingAction,
      pendingActionExpiresAt: users.pendingActionExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.pendingAction) {
    return null;
  }

  if (
    !user.pendingActionExpiresAt ||
    user.pendingActionExpiresAt.getTime() <= Date.now()
  ) {
    await clearPendingAction(userId);
    return null;
  }

  return user.pendingAction as PendingAction;
}

export async function setPendingAction(userId: string, action: PendingAction) {
  await db
    .update(users)
    .set({
      pendingAction: action,
      pendingActionExpiresAt: new Date(Date.now() + pendingActionTtlMs),
    })
    .where(eq(users.id, userId));
}

export async function clearPendingAction(userId: string) {
  await db
    .update(users)
    .set({
      pendingAction: null,
      pendingActionExpiresAt: null,
    })
    .where(eq(users.id, userId));
}
