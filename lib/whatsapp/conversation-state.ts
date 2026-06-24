import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export type PendingAction =
  | "select_arisan"
  | "reset_pin"
  | "create_arisan"
  | "confirm_payment"
  | "manage_period"
  | "manage_giliran"
  | "manage_members"
  | "manage_settings"
  | "manage_package"
  | "manage_owner_review"
  | "record_payment";

export type PendingActionState = {
  action: PendingAction;
  data: Record<string, unknown>;
};

// How long a started flow stays open before a later, unrelated message could be
// misread as flow input. Keeps multi-step flows from silently capturing input
// typed hours later.
const pendingActionTtlMs = 15 * 60 * 1000;

export async function getPendingAction(
  userId: string,
): Promise<PendingActionState | null> {
  const [user] = await db
    .select({
      pendingAction: users.pendingAction,
      pendingActionData: users.pendingActionData,
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

  return {
    action: user.pendingAction as PendingAction,
    data: user.pendingActionData ?? {},
  };
}

export async function setPendingAction(
  userId: string,
  action: PendingAction,
  data: Record<string, unknown> = {},
) {
  await db
    .update(users)
    .set({
      pendingAction: action,
      pendingActionData: data,
      pendingActionExpiresAt: new Date(Date.now() + pendingActionTtlMs),
    })
    .where(eq(users.id, userId));
}

export async function clearPendingAction(userId: string) {
  await db
    .update(users)
    .set({
      pendingAction: null,
      pendingActionData: null,
      pendingActionExpiresAt: null,
    })
    .where(eq(users.id, userId));
}
