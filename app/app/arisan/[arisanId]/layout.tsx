import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireArisanMembership } from "@/lib/auth/user";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function ArisanLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ arisanId: string }>;
}>) {
  const { arisanId } = await params;

  const { membership, user } = await requireArisanMembership(arisanId);
  const unreadCount = await getUnreadNotificationCount(user.id);

  return (
    <DashboardShell
      arisanId={arisanId}
      role={membership.role}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
