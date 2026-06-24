import { ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";

import {
  BrandLogo,
  GlassPanel,
  PageShell,
  buttonStyles,
  cn,
} from "@/components/ui/app-ui";
import { formatDateTimeLabel } from "@/lib/arisan";
import { requireUser } from "@/lib/auth/user";
import {
  getUserNotifications,
  type DashboardNotification,
} from "@/lib/notifications";

import {
  markAllReadAction,
  markOneReadAction,
  openNotificationAction,
} from "./actions";

const typeLabels: Record<string, string> = {
  payment_proof: "Bukti Bayar",
  whatsapp_skipped: "WhatsApp",
  info: "Info",
};

function notificationLink(notification: DashboardNotification) {
  if (notification.type === "payment_proof" && notification.arisanGroupId) {
    return `/app/arisan/${notification.arisanGroupId}/payments`;
  }

  return null;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getUserNotifications(user.id);
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <PageShell>
      <div className="space-y-6 py-4">
        <GlassPanel className="p-6" variant="elevated">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <BrandLogo />
              <h1 className="mt-6 flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
                <Bell className="size-6 text-primary" />
                Notifikasi
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} notifikasi belum dibaca.`
                  : "Semua notifikasi sudah dibaca."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {unreadCount > 0 ? (
                <form action={markAllReadAction}>
                  <button className={`${buttonStyles.primary} w-full`} type="submit">
                    Tandai semua dibaca
                  </button>
                </form>
              ) : null}
              <Link className={`${buttonStyles.secondary} gap-2`} href="/app">
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </div>
          </div>
        </GlassPanel>

        {notifications.length === 0 ? (
          <GlassPanel className="p-8 text-center" variant="subtle">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-surface text-success-foreground">
              <Bell className="size-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Belum ada notifikasi
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Notifikasi muncul di sini saat ada bukti bayar baru atau pesan
              WhatsApp yang tidak bisa dikirim di luar jam aktif.
            </p>
          </GlassPanel>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const href = notificationLink(notification);
              const typeLabel =
                typeLabels[notification.type] ?? notification.type;

              return (
                <div
                  className={cn(
                    "rounded-[1.5rem] border p-5 shadow-sm backdrop-blur-xl transition",
                    notification.isRead
                      ? "border-border bg-card"
                      : "border-success-border bg-success-surface",
                  )}
                  key={notification.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {typeLabel}
                    </span>
                    {!notification.isRead ? (
                      <span className="inline-flex items-center rounded-full border border-success-border bg-success-surface px-3 py-1 text-xs font-semibold text-success-foreground">
                        Baru
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTimeLabel(notification.createdAt)}
                    </span>
                  </div>

                  <p className="mt-3 text-base font-semibold text-foreground">
                    {notification.title}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {notification.message}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {href ? (
                      <form action={openNotificationAction}>
                        <input name="id" type="hidden" value={notification.id} />
                        <button className={buttonStyles.secondary} type="submit">
                          Buka bukti
                        </button>
                      </form>
                    ) : null}
                    {!notification.isRead ? (
                      <form action={markOneReadAction}>
                        <input name="id" type="hidden" value={notification.id} />
                        <button className={buttonStyles.ghost} type="submit">
                          Tandai dibaca
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
