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

import {
  getActiveArisanId,
  promptArisanSelection,
  resolveArisanContext,
  roleLabel,
} from "./active-arisan";
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

function adminMemberships(memberships: Membership[]) {
  return memberships.filter((membership) => membership.role === "admin");
}

async function getActiveMembership(userId: string, memberships: Membership[]) {
  const activeArisanId = await getActiveArisanId(userId);

  return (
    memberships.find(
      (membership) => membership.arisanGroupId === activeArisanId,
    ) ?? null
  );
}

// Picks the menu role for a user. Single arisan -> that role. Multiple ->
// the active arisan's role if one is selected, otherwise default to admin when
// the user manages any arisan so all admin commands stay discoverable.
async function menuRoleFor(userId: string, memberships: Membership[]) {
  if (memberships.length === 1) {
    return memberships[0].role;
  }

  const active = await getActiveMembership(userId, memberships);

  if (active) {
    return active.role;
  }

  return adminMemberships(memberships).length > 0 ? "admin" : "member";
}

function menuForRole(role: string) {
  return role === "admin" ? adminMenu() : memberMenu();
}

function joinHelp() {
  return `Kamu belum terdaftar di arisan.
Ketik JOIN <kode>, contoh: JOIN ARSDEMO
Atau buka ${dashboardUrl("/app")}`;
}

async function helpText(userId: string, memberships: Membership[]) {
  const menu =
    memberships.length === 0
      ? memberMenu()
      : menuForRole(await menuRoleFor(userId, memberships));

  const switchHint =
    memberships.length > 1 ? "\nKetik ARISAN untuk ganti arisan." : "";

  return `Bantuan MyArisan
Ketik salah satu perintah berikut:

${menu}${switchHint}

Kirim foto bukti transfer kapan saja untuk dicatat sebagai pembayaran.
Ketik BATAL untuk membatalkan langkah yang sedang berjalan.`;
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

async function handleArisanSwitch(userId: string, memberships: Membership[]) {
  if (memberships.length === 0) {
    return joinHelp();
  }

  if (memberships.length === 1) {
    return `Kamu hanya punya satu arisan: ${memberships[0].arisanName}.`;
  }

  return promptArisanSelection(userId, memberships, { name: "menu" });
}

async function handleStatus(userId: string, membership: Membership) {
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

async function handleBayar(membership: Membership) {
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

async function handleRecap(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

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

async function handleTagih(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

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

async function handleBelumBayar(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

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

async function handleRekening(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

  if (!dashboard) {
    return "Data arisan tidak ditemukan.";
  }

  return `Rekening admin ${dashboard.group.name}
${dashboard.group.bankAccountText ?? "Belum diisi admin."}
Setoran: ${formatRupiah(dashboard.group.amountPerPeriod)}

Setelah transfer, kirim foto bukti bayar di chat ini.`;
}

async function handleGiliran(userId: string, membership: Membership) {
  if (membership.role === "admin") {
    return beginManageGiliran(userId, membership.arisanGroupId);
  }

  const giliran = await getGiliranData(membership.arisanGroupId);

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

async function handleRiwayat(userId: string, membership: Membership) {
  const history = await getMemberPaymentHistory(membership.arisanGroupId, userId);

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
    `/app/arisan/${membership.arisanGroupId}/riwayat`,
  )}`;
}

export async function handleWhatsAppCommand(input: {
  command: WhatsAppCommand;
  userId: string;
}): Promise<string> {
  const { userId } = input;
  const memberships = await getUserMemberships(userId);

  // Resolves the target arisan for a context command, then runs `run` against
  // it. Returns the resolver's message when there is nothing to run (no arisan,
  // admin-only, or a numbered selection prompt).
  const withArisan = async (
    scope: "admin" | "any",
    run: (membership: Membership) => Promise<string>,
  ) => {
    const context = await resolveArisanContext({
      command: input.command,
      memberships,
      scope,
      userId,
    });

    if (context.kind !== "ok") {
      return context.reply;
    }

    return run(context.membership);
  };

  switch (input.command.name) {
    case "menu":
    case "unknown": {
      const ownerHint = (await isOwnerUserId(userId))
        ? "\n\nKamu owner MyArisan. Ketik OWNER untuk cek bukti paket."
        : "";

      if (memberships.length === 0) {
        return ownerHint ? `Menu owner MyArisan${ownerHint}` : joinHelp();
      }

      if (memberships.length === 1) {
        return `${menuForRole(memberships[0].role)}${ownerHint}`;
      }

      const active = await getActiveMembership(userId, memberships);

      if (!active) {
        return promptArisanSelection(userId, memberships, { name: "menu" });
      }

      return `Arisan aktif: ${active.arisanName} (${roleLabel(active.role)})
${menuForRole(active.role)}

Ketik ARISAN untuk ganti arisan.${ownerHint}`;
    }
    case "arisan":
      return handleArisanSwitch(userId, memberships);
    case "bantuan":
      return helpText(userId, memberships);
    case "join":
      return handleJoin(input.command);
    case "status":
      return withArisan("any", (membership) => handleStatus(userId, membership));
    case "bayar":
      return withArisan("any", handleBayar);
    case "rekening":
      return withArisan("any", handleRekening);
    case "giliran":
      return withArisan("any", (membership) =>
        handleGiliran(userId, membership),
      );
    case "riwayat":
      return withArisan("any", (membership) =>
        handleRiwayat(userId, membership),
      );
    case "buat-arisan":
      return beginCreateArisan(userId);
    case "rekap":
      return withArisan("admin", handleRecap);
    case "belum-bayar":
      return withArisan("admin", handleBelumBayar);
    case "tagih":
      return withArisan("admin", handleTagih);
    case "konfirmasi":
      return withArisan("admin", (membership) =>
        beginKonfirmasi(userId, membership.arisanGroupId, membership.arisanName),
      );
    case "anggota":
      return withArisan("admin", (membership) =>
        beginManageAnggota(userId, membership.arisanGroupId),
      );
    case "catat-bayar":
      return withArisan("admin", (membership) =>
        beginCatatBayar(userId, membership.arisanGroupId),
      );
    case "periode":
      return withArisan("admin", (membership) =>
        beginPeriode(userId, membership.arisanGroupId, membership.arisanName),
      );
    case "paket":
      return withArisan("admin", (membership) =>
        beginPaket(userId, membership.arisanGroupId, membership.arisanName),
      );
    case "owner":
      return beginOwnerReview(userId);
    case "pengaturan":
      return withArisan("admin", (membership) =>
        beginPengaturan(userId, membership.arisanGroupId),
      );
    case "dashboard":
      return `Buka dashboard MyArisan: ${dashboardUrl("/app")}`;
    case "reset-pin":
      return beginResetPin(userId);
  }
}
