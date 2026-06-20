import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { arisanGroups } from "@/db/schema";
import {
  buildRecapText,
  formatDateLabel,
  formatRupiah,
  getArisanDashboardData,
  getMemberDashboardData,
  getMemberPaymentHistory,
  paymentStatusLabel,
} from "@/lib/arisan";
import { getUserMemberships } from "@/lib/auth/user";
import { getGiliranData } from "@/lib/giliran";
import { isOwnerUserId } from "@/lib/owner";

import type { WhatsAppCommand } from "./command-parser";
import { getWhatsAppConfig, reportMissingWhatsAppEnv } from "./config";
import { beginManageAnggota } from "./handle-anggota";
import { beginCatatBayar } from "./handle-catat-bayar";
import { beginCreateArisan } from "./handle-create-arisan";
import { beginManageGiliran } from "./handle-giliran";
import { beginKonfirmasi } from "./handle-konfirmasi";
import { beginOwnerReview } from "./handle-owner";
import { beginPaket } from "./handle-paket";
import { beginPengaturan } from "./handle-pengaturan";
import { beginPeriode } from "./handle-periode";
import { beginResetPin } from "./handle-reset-pin";

type Membership = Awaited<ReturnType<typeof getUserMemberships>>[number];

function getAppUrl() {
  reportMissingWhatsAppEnv(["NEXT_PUBLIC_APP_URL"], "links");

  return getWhatsAppConfig().appUrl;
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
- rekening
- giliran
- riwayat
- dashboard
- join <kode>
- bantuan
- reset pin`;
}

function adminMenu() {
  return `Menu admin MyArisan
- buat arisan
- status
- rekap
- belum bayar
- tagih
- konfirmasi
- catat bayar
- anggota
- giliran
- periode
- paket
- pengaturan
- dashboard
- bantuan
- reset pin`;
}

function helpText(memberships: Membership[]) {
  const isAdmin = adminMemberships(memberships).length > 0;
  const menu = isAdmin ? adminMenu() : memberMenu();

  return `Bantuan MyArisan
Ketik salah satu perintah berikut:

${menu}

Kirim foto bukti transfer kapan saja untuk dicatat sebagai pembayaran.
Ketik BATAL untuk membatalkan langkah yang sedang berjalan.`;
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

Setelah transfer, kirim foto bukti bayar di chat ini.
Dashboard: ${dashboardUrl(`/app/arisan/${membership.arisanGroupId}/bayar`)}`;
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

async function handlePackage(userId: string, memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  return beginPaket(
    userId,
    selected.membership.arisanGroupId,
    selected.membership.arisanName,
  );
}

async function handlePengaturan(userId: string, memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  return beginPengaturan(userId, selected.membership.arisanGroupId);
}

function selectSingleMembership(memberships: Membership[]) {
  if (memberships.length === 0) {
    return {
      error: "Kamu belum masuk ke arisan. Ketik JOIN <kode> untuk mulai.",
      membership: null,
    };
  }

  if (memberships.length > 1) {
    return {
      error: `Kamu terdaftar di beberapa arisan:
${membershipList(memberships)}

Buka dashboard untuk memilih arisan: ${dashboardUrl("/app")}`,
      membership: null,
    };
  }

  return { error: null, membership: memberships[0] };
}

async function handleRekening(memberships: Membership[]) {
  const selected = selectSingleMembership(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  const dashboard = await getArisanDashboardData(selected.membership.arisanGroupId);

  if (!dashboard) {
    return "Data arisan tidak ditemukan.";
  }

  return `Rekening admin ${dashboard.group.name}
${dashboard.group.bankAccountText ?? "Belum diisi admin."}
Setoran: ${formatRupiah(dashboard.group.amountPerPeriod)}

Setelah transfer, kirim foto bukti bayar di chat ini.`;
}

async function handleGiliran(userId: string, memberships: Membership[]) {
  const selected = selectSingleMembership(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  if (selected.membership.role === "admin") {
    return beginManageGiliran(userId, selected.membership.arisanGroupId);
  }

  const giliran = await getGiliranData(selected.membership.arisanGroupId);

  if (!giliran) {
    return "Data arisan tidak ditemukan.";
  }

  const order =
    giliran.members.length > 0
      ? giliran.members
          .map((member, index) => {
            const mark = member.isCurrentDraw ? " (giliran sekarang)" : "";
            return `${index + 1}. ${member.displayName}${mark}`;
          })
          .join("\n")
      : "Belum ada anggota.";

  return `Giliran ${giliran.group.name}
Periode: ${giliran.activePeriod?.name ?? "Belum ada"}
Giliran sekarang: ${giliran.currentDrawName ?? "Belum diatur"}

Urutan:
${order}

Giliran diatur oleh admin.`;
}

async function handleRiwayat(userId: string, memberships: Membership[]) {
  const selected = selectSingleMembership(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  const history = await getMemberPaymentHistory(
    selected.membership.arisanGroupId,
    userId,
  );

  if (!history) {
    return "Data arisan tidak ditemukan.";
  }

  if (history.payments.length === 0) {
    return `Belum ada riwayat pembayaran di ${history.group.name}.
Kirim foto bukti transfer untuk mulai mencatat.`;
  }

  const rows = history.payments
    .slice(0, 10)
    .map(
      (payment) =>
        `- ${payment.periodName}: ${
          payment.amount ? formatRupiah(payment.amount) : "-"
        } (${paymentStatusLabel(payment.status)})`,
    )
    .join("\n");

  return `Riwayat pembayaran ${history.group.name}
Sudah dikonfirmasi: ${history.confirmedCount}x
Total: ${formatRupiah(history.totalPaid)}

${rows}

Selengkapnya: ${dashboardUrl(
    `/app/arisan/${selected.membership.arisanGroupId}/riwayat`,
  )}`;
}

async function handleBelumBayar(memberships: Membership[]) {
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

  return `Belum bayar ${dashboard.group.name}
Periode: ${dashboard.activePeriod?.name ?? "Belum ada"}
Jumlah belum bayar: ${dashboard.unpaidMembers.length}

${dashboard.unpaidMembers.map((name) => `- ${name}`).join("\n")}

Ketik TAGIH untuk membuat teks pengingat.`;
}

async function handleAnggota(userId: string, memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  return beginManageAnggota(userId, selected.membership.arisanGroupId);
}

async function handleCatatBayar(userId: string, memberships: Membership[]) {
  const selected = selectSingleAdmin(memberships);

  if (!selected.membership) {
    return selected.error!;
  }

  return beginCatatBayar(userId, selected.membership.arisanGroupId);
}

export async function handleWhatsAppCommand(input: {
  command: WhatsAppCommand;
  userId: string;
}) {
  const memberships = await getUserMemberships(input.userId);

  switch (input.command.name) {
    case "menu":
    case "unknown": {
      const ownerHint = (await isOwnerUserId(input.userId))
        ? "\n\nKamu owner MyArisan. Ketik OWNER untuk cek bukti paket."
        : "";

      if (adminMemberships(memberships).length > 0) {
        return `${adminMenu()}${ownerHint}`;
      }

      if (memberships.length > 0) {
        return `${memberMenu()}${ownerHint}`;
      }

      if (ownerHint) {
        return `Menu owner MyArisan${ownerHint}`;
      }

      return joinHelp();
    }
    case "bantuan":
      return helpText(memberships);
    case "join":
      return handleJoin(input.command);
    case "status":
      return handleStatus(input.userId, memberships);
    case "bayar":
      return handleBayar(memberships);
    case "rekening":
      return handleRekening(memberships);
    case "giliran":
      return handleGiliran(input.userId, memberships);
    case "riwayat":
      return handleRiwayat(input.userId, memberships);
    case "buat-arisan":
      return beginCreateArisan(input.userId);
    case "rekap":
      return handleRecap(memberships);
    case "belum-bayar":
      return handleBelumBayar(memberships);
    case "tagih":
      return handleTagih(memberships);
    case "konfirmasi":
      return beginKonfirmasi(input.userId, memberships);
    case "anggota":
      return handleAnggota(input.userId, memberships);
    case "catat-bayar":
      return handleCatatBayar(input.userId, memberships);
    case "periode":
      return beginPeriode(input.userId, memberships);
    case "paket":
      return handlePackage(input.userId, memberships);
    case "owner":
      return beginOwnerReview(input.userId);
    case "pengaturan":
      return handlePengaturan(input.userId, memberships);
    case "dashboard":
      return `Buka dashboard MyArisan: ${dashboardUrl("/app")}`;
    case "reset-pin":
      return beginResetPin(input.userId);
  }
}
