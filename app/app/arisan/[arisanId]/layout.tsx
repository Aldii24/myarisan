import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireArisanMembership } from "@/lib/auth/user";

export default async function ArisanLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ arisanId: string }>;
}>) {
  const { arisanId } = await params;

  const { membership } = await requireArisanMembership(arisanId);

  return (
    <DashboardShell arisanId={arisanId} role={membership.role}>
      {children}
    </DashboardShell>
  );
}
