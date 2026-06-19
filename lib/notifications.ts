import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { dashboardNotifications } from "@/db/schema";

export type DashboardNotification = typeof dashboardNotifications.$inferSelect;

export async function getUserNotifications(userId: string, limit = 50) {
  return db
    .select()
    .from(dashboardNotifications)
    .where(eq(dashboardNotifications.userId, userId))
    .orderBy(desc(dashboardNotifications.createdAt))
    .limit(limit);
}

export async function getNotificationForUser(
  notificationId: string,
  userId: string,
) {
  const [row] = await db
    .select()
    .from(dashboardNotifications)
    .where(
      and(
        eq(dashboardNotifications.id, notificationId),
        eq(dashboardNotifications.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getUnreadNotificationCount(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(dashboardNotifications)
    .where(
      and(
        eq(dashboardNotifications.userId, userId),
        eq(dashboardNotifications.isRead, false),
      ),
    );

  return row?.value ?? 0;
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await db
    .update(dashboardNotifications)
    .set({ isRead: true })
    .where(
      and(
        eq(dashboardNotifications.id, notificationId),
        eq(dashboardNotifications.userId, userId),
      ),
    );
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(dashboardNotifications)
    .set({ isRead: true })
    .where(
      and(
        eq(dashboardNotifications.userId, userId),
        eq(dashboardNotifications.isRead, false),
      ),
    );
}
