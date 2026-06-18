import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups } from "@/db/schema";
import {
  buildRecapText,
  formatDateLabel,
  formatDateTimeLabel,
  formatRupiah,
  getArisanDashboardData,
  getMemberDashboardData,
  paymentStatusLabel,
} from "@/lib/arisan";
import { getUserMemberships } from "@/lib/auth/user";
import { getPackageStatus } from "@/lib/subscription";

import type { WhatsAppCommand } from "./command-parser";

type Membership = Awaited<ReturnType<typeof getUserMemberships>>[number];

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function dashboardUrl(path = "/app") {
  return `${getAppUrl()}${path}`;
}

function membershipList(memberships: Membership[]) {
  return memberships.map((membership) => `- ${membership.arisanName}`).join("\n");
}

function memberMenu() {
  return `Menu anggota MyArisan
- status
- bayar
- dashboard
- join <kode>
- reset pin`;
}

function adminMenu() {
  return `Menu admin MyArisan
- status
- rekap
- tagih
- konfirmasi
- paket
- dashboard
- join <kode>
- reset pin`;
}

function joinHelp() {
  return `Kamu belum terdaftar di arisan.
Ketik JOIN <kode>, contoh: JOIN ARSDEMO
Atau buka ${dashboardUrl("/app")}`;
}

function adminMemberships(memberships: Membership[]) {
  return memberships.filter((membership) => membership.role === "admin");
}

function adminOnlyMessage() {
  return "Perintah ini hanya untuk admin arisan.";
}

function selectSingleAdmin(memberships: Membership[]) {
  const admins = adminMemberships(memberships);

  if (admins.length === 0) {
    return { error: adminOnlyMessage(), membership: null };
  }

  if (admins.length > 1) {
    return {
      error: `Kamu mengelola beberapa arisan:
${membershipList(admins)}

Buka dashboard untuk memilih arisan: ${dashboardUrl("/app")}`,
      membership: null,
    };
  }

  return { error: null, membership: admins[0] };
}

async function handleJoin(command: Extract<WhatsAppCommand, { name: "join" }>) {
  if (!command.code) {
    return "Ketik JOIN diikuti kode arisan. Contoh: JOIN ARSDEMO";
  }

  const [group] = await db
    .select({ joinCode: arisanGroups.joinCode })
    .from(arisanGroups)
    .where(eq(arisanGroups.joinCode, command.code))
    .limit(1);

  if (!group) {
    return "Kode arisan tidak ditemukan.";
  }

  return `Untuk daftar, buka link ini dan pilih nama kamu: ${dashboardUrl(
    `/join/${group.joinCode}`,
  )}`;
}

async function handleStatus(userId: string, memberships: Membership[]) {
  if (memberships.length === 0) {
    return "Kamu belum masuk ke arisan. Ketik JOIN <kode> untuk mulai.";
  }

  if (memberships.length > 1) {
    return `Kamu terdaftar di beberapa arisan:
${membershipList(memberships)}

Cek status lengkap di dashboard: ${dashboardUrl("/app")}`;
  }

  const membership = memberships[0];

  if (membership.role === "admin") {
    const dashboard = await getArisanDashboardData(membership.arisanGroupId);

    if (!dashboard) {
      return "Data arisan tidak ditemukan.";
    }

    return `Status ${dashboard.group.name}
Periode: ${dashboard.activePeriod?.name ?? "Belum ada"}
Sudah bayar: ${dashboard.paidCount}
Belum bayar: ${dashboard.unpaidMembers.length}
Menunggu dicek: ${dashboard.pendingCount}

${dashboardUrl(`/app/arisan/${membership.arisanGroupId}`)}`;
  }

  const dashboard = await getMemberDashboardData(membership.arisanGroupId, userId);

  if (!dashboard) {
    return "Data arisan tidak ditemukan.";
  }

  return `Status ${dashboard.group.name}
Periode: ${dashboard.activePeriod?.name ?? "Belum ada"}
Status kamu: ${paymentStatusLabel(dashboard.paymentStatus)}
Setoran: ${formatRupiah(dashboard.group.amountPerPeriod)}

${dashboardUrl(`/app/arisan/${membership.arisanGroupId}`)}`;
}

async function handleBayar(memberships: Membership[]) {
  if (memberships.length === 0) {
    return "Kamu belum masuk ke arisan. Ketik JOIN <kode> untuk mulai.";
  }

  if (memberships.length > 1) {
    return `Pilih arisan dari dashboard untuk melihat rincian pembayaran:
${membershipList(memberships)}

${dashboardUrl("/app")}`;
  }

  const membership = memberships[0];
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

  if (!dashboard) {
    return "Data arisan tidak ditemukan.";
  }

  return `Pembayaran ${dashboard.group.name}
Periode: ${dashboard.activePeriod?.name ?? "Belum ada"}
Setoran: ${formatRupiah(dashboard.group.amountPerPeriod)}
Rekening admin:
${dashboard.group.bankAccountText ?? "Belum diisi"}

Upload bukti dari dashboard untuk sekarang:
${dashboardUrl(`/app/arisan/${membership.arisanGroupId}/bayar`)}`;
}

async function handleRecap(memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  const dashboard = await getArisanDashboardData(selected.membership.arisanGroupId);

  if (!dashboard) {
    return "Data arisan tidak ditemukan.";
  }

  return buildRecapText({
    arisanName: dashboard.group.name,
    drawMemberName: dashboard.drawMemberName,
    paidCount: dashboard.paidCount,
    pendingCount: dashboard.pendingCount,
    periodName: dashboard.activePeriod?.name,
    totalCollected: dashboard.totalCollected,
    unpaidMembers: dashboard.unpaidMembers,
  });
}

async function handleTagih(memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  const dashboard = await getArisanDashboardData(selected.membership.arisanGroupId);

  if (!dashboard) {
    return "Data arisan tidak ditemukan.";
  }

  if (dashboard.unpaidMembers.length === 0) {
    return `Semua anggota ${dashboard.group.name} sudah bayar untuk ${
      dashboard.activePeriod?.name ?? "periode aktif"
    }.`;
  }

  return `Pengingat pembayaran ${dashboard.group.name}
Periode: ${dashboard.activePeriod?.name ?? "Belum ada"}
Setoran: ${formatRupiah(dashboard.group.amountPerPeriod)}
Batas setor: ${formatDateLabel(dashboard.activePeriod?.dueDate)}

Belum bayar:
${dashboard.unpaidMembers.map((name) => `- ${name}`).join("\n")}

Silakan transfer ke rekening admin dan kirim bukti melalui MyArisan.`;
}

async function handleConfirmation(memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  const dashboard = await getArisanDashboardData(selected.membership.arisanGroupId);

  if (!dashboard) {
    return "Data arisan tidak ditemukan.";
  }

  return `${dashboard.pendingCount} bukti pembayaran menunggu dicek untuk ${dashboard.group.name}.

Buka Konfirmasi Bukti:
${dashboardUrl(`/app/arisan/${selected.membership.arisanGroupId}/payments`)}`;
}

async function handlePackage(memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  const packageStatus = await getPackageStatus(selected.membership.arisanGroupId);

  return `Paket ${selected.membership.arisanName}
Paket saat ini: ${packageStatus.currentPlan.name}
Status: ${packageStatus.status}
Anggota: ${packageStatus.memberUsed}/${packageStatus.memberLimit}
Baca bukti: ${packageStatus.proofUsed}/${packageStatus.proofLimit}
Aktif sampai: ${formatDateTimeLabel(packageStatus.activeUntil)}

${dashboardUrl(`/app/arisan/${selected.membership.arisanGroupId}/paket`)}`;
}

export async function handleWhatsAppCommand(input: {
  command: WhatsAppCommand;
  userId: string;
}) {
  const memberships = await getUserMemberships(input.userId);

  switch (input.command.name) {
    case "menu":
    case "unknown":
      if (adminMemberships(memberships).length > 0) {
        return adminMenu();
      }

      if (memberships.length > 0) {
        return memberMenu();
      }

      return joinHelp();
    case "join":
      return handleJoin(input.command);
    case "status":
      return handleStatus(input.userId, memberships);
    case "bayar":
      return handleBayar(memberships);
    case "rekap":
      return handleRecap(memberships);
    case "tagih":
      return handleTagih(memberships);
    case "konfirmasi":
      return handleConfirmation(memberships);
    case "paket":
      return handlePackage(memberships);
    case "dashboard":
      return `Buka dashboard MyArisan: ${dashboardUrl("/app")}`;
    case "reset-pin":
      return "Untuk reset PIN, buka dashboard atau gunakan flow reset PIN yang tersedia.";
  }
}
