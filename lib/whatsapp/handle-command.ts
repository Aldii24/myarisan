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
import { bold, compose, field, footer, header, italic } from "./format";
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
import type { WhatsAppReply } from "./send-message";

type Membership = Awaited<ReturnType<typeof getUserMemberships>>[number];

function getAppUrl() {
  reportMissingWhatsAppEnv(["NEXT_PUBLIC_APP_URL"], "links");

  return getWhatsAppConfig().appUrl;
}

function dashboardUrl(path = "/app") {
  return `${getAppUrl()}${path}`;
}

function linkBlock(label: string, path = "/app") {
  return `📲 ${italic(label)}\n${dashboardUrl(path)}`;
}

const adminMenuItems = [
  "✨ *buat arisan* — bikin arisan baru",
  "🧾 *status* — ringkasan arisan",
  "📌 *rekap* — teks rekap untuk grup",
  "⏳ *belum bayar* — siapa yang belum setor",
  "🔔 *tagih* — teks tagihan untuk grup",
  "✅ *konfirmasi* — cek bukti yang masuk",
  "💸 *catat bayar* — catat pembayaran manual",
  "👥 *anggota* — kelola anggota",
  "🎲 *giliran* — atur giliran",
  "🗓️ *periode* — tutup & buka periode",
  "💎 *paket* — atur paket langganan",
  "⚙️ *pengaturan* — ubah data arisan",
  "📲 *dashboard* — buka halaman web",
  "🔐 *reset pin* — ganti PIN",
];

const memberMenuItems = [
  "🧾 *status* — status bayar kamu",
  "💸 *bayar* — cara & rekening setor",
  "🏦 *rekening* — rekening admin",
  "🎲 *giliran* — lihat urutan giliran",
  "📜 *riwayat* — riwayat bayar kamu",
  "🙋 *join <kode>* — gabung arisan",
  "📲 *dashboard* — buka halaman web",
  "🔐 *reset pin* — ganti PIN",
];

function menuBody(role: string) {
  const items = role === "admin" ? adminMenuItems : memberMenuItems;

  return `Ketik salah satu perintah:\n${items.join("\n")}`;
}

function ownerHintFor(isOwner: boolean) {
  return isOwner
    ? footer("🛡️ Kamu owner MyArisan — ketik OWNER untuk cek bukti paket.")
    : null;
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

function joinHelp() {
  return compose(
    header("🙋", "Gabung Arisan"),
    "Kamu belum terdaftar di arisan mana pun.",
    `Ketik ${bold("JOIN <kode>")} — contoh: ${bold("JOIN ARSDEMO")}`,
    linkBlock("Atau buka lewat web:"),
  );
}

async function helpText(userId: string, memberships: Membership[]) {
  const role =
    memberships.length === 0
      ? "member"
      : await menuRoleFor(userId, memberships);

  return compose(
    header("❓", "Bantuan MyArisan"),
    menuBody(role),
    memberships.length > 1 ? footer("Ketik ARISAN untuk ganti arisan.") : null,
    footer(
      "Kirim foto bukti transfer kapan saja untuk dicatat. Ketik BATAL untuk membatalkan langkah berjalan.",
    ),
  );
}

async function handleJoin(command: Extract<WhatsAppCommand, { name: "join" }>) {
  if (!command.code) {
    return compose(
      header("🙋", "Gabung Arisan"),
      `Ketik ${bold("JOIN <kode>")} diikuti kode arisan.`,
      `Contoh: ${bold("JOIN ARSDEMO")}`,
    );
  }

  const [group] = await db
    .select({ joinCode: arisanGroups.joinCode })
    .from(arisanGroups)
    .where(eq(arisanGroups.joinCode, command.code))
    .limit(1);

  if (!group) {
    return compose(
      header("🙋", "Gabung Arisan"),
      "⚠️ Kode arisan tidak ditemukan. Cek lagi kodenya ya.",
    );
  }

  return compose(
    header("🙋", "Gabung Arisan"),
    "Tinggal satu langkah lagi! Buka link ini lalu pilih nama kamu:",
    dashboardUrl(`/join/${group.joinCode}`),
  );
}

async function handleArisanSwitch(userId: string, memberships: Membership[]) {
  if (memberships.length === 0) {
    return joinHelp();
  }

  if (memberships.length === 1) {
    return compose(
      header("🔄", "Ganti Arisan"),
      `Kamu hanya punya satu arisan: ${bold(memberships[0].arisanName)}.`,
    );
  }

  return promptArisanSelection(userId, memberships, { name: "menu" });
}

async function handleStatus(userId: string, membership: Membership) {
  if (membership.role === "admin") {
    const dashboard = await getArisanDashboardData(membership.arisanGroupId);

    if (!dashboard) {
      return "⚠️ Data arisan tidak ditemukan.";
    }

    return compose(
      header("🧾", "Status Arisan", dashboard.group.name),
      [
        field("📅", "Periode", dashboard.activePeriod?.name ?? "Belum ada"),
        field("✅", "Sudah bayar", `${dashboard.paidCount} orang`),
        field("⏳", "Belum bayar", `${dashboard.unpaidMembers.length} orang`),
        field("🔍", "Menunggu dicek", dashboard.pendingCount),
        field("💰", "Terkumpul", formatRupiah(dashboard.totalCollected)),
      ].join("\n"),
      linkBlock("Lihat detail:", `/app/arisan/${membership.arisanGroupId}`),
    );
  }

  const dashboard = await getMemberDashboardData(membership.arisanGroupId, userId);

  if (!dashboard) {
    return "⚠️ Data arisan tidak ditemukan.";
  }

  return compose(
    header("🧾", "Status Kamu", dashboard.group.name),
    [
      field("📅", "Periode", dashboard.activePeriod?.name ?? "Belum ada"),
      field("📌", "Status kamu", paymentStatusLabel(dashboard.paymentStatus)),
      field("💸", "Setoran", formatRupiah(dashboard.group.amountPerPeriod)),
    ].join("\n"),
    linkBlock("Lihat detail:", `/app/arisan/${membership.arisanGroupId}`),
  );
}

async function handleBayar(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

  if (!dashboard) {
    return "⚠️ Data arisan tidak ditemukan.";
  }

  return compose(
    header("💸", "Cara Bayar", dashboard.group.name),
    [
      field("📅", "Periode", dashboard.activePeriod?.name ?? "Belum ada"),
      field("💰", "Setoran", formatRupiah(dashboard.group.amountPerPeriod)),
    ].join("\n"),
    `🏦 ${italic("Rekening admin:")}\n${dashboard.group.bankAccountText ?? "Belum diisi"}`,
    "📸 Setelah transfer, kirim *foto bukti bayar* di chat ini ya.",
    linkBlock("Atau bayar lewat web:", `/app/arisan/${membership.arisanGroupId}/bayar`),
  );
}

async function handleRecap(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

  if (!dashboard) {
    return "⚠️ Data arisan tidak ditemukan.";
  }

  // Plain, copy-paste-friendly text the admin pastes into their group chat — kept
  // free of bot chrome on purpose.
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
    return "⚠️ Data arisan tidak ditemukan.";
  }

  if (dashboard.unpaidMembers.length === 0) {
    return compose(
      header("🔔", "Tagihan", dashboard.group.name),
      `🎉 Semua anggota sudah bayar untuk ${
        dashboard.activePeriod?.name ?? "periode aktif"
      }.`,
    );
  }

  // Copy-paste-friendly reminder text for the group — left as plain text.
  return `Teman-teman, reminder arisan ${dashboard.group.name} ya 🙏
Periode: ${dashboard.activePeriod?.name ?? "Belum ada"}
Setoran: ${formatRupiah(dashboard.group.amountPerPeriod)}
Batas setor: ${formatDateLabel(dashboard.activePeriod?.dueDate)}

Yang belum setor:
${dashboard.unpaidMembers.map((name) => `- ${name}`).join("\n")}

Kalau sudah transfer, kirim bukti ke MyArisan ya. Terima kasih 🙏`;
}

async function handleBelumBayar(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

  if (!dashboard) {
    return "⚠️ Data arisan tidak ditemukan.";
  }

  if (dashboard.unpaidMembers.length === 0) {
    return compose(
      header("⏳", "Belum Bayar", dashboard.group.name),
      `🎉 Semua anggota sudah bayar untuk ${
        dashboard.activePeriod?.name ?? "periode aktif"
      }.`,
    );
  }

  return compose(
    header("⏳", "Belum Bayar", dashboard.group.name),
    [
      field("📅", "Periode", dashboard.activePeriod?.name ?? "Belum ada"),
      field("👥", "Belum bayar", `${dashboard.unpaidMembers.length} orang`),
    ].join("\n"),
    dashboard.unpaidMembers.map((name) => `• ${name}`).join("\n"),
    footer("Ketik TAGIH untuk membuat teks pengingat siap kirim."),
  );
}

async function handleRekening(membership: Membership) {
  const dashboard = await getArisanDashboardData(membership.arisanGroupId);

  if (!dashboard) {
    return "⚠️ Data arisan tidak ditemukan.";
  }

  return compose(
    header("🏦", "Rekening Admin", dashboard.group.name),
    `${dashboard.group.bankAccountText ?? "Belum diisi admin."}`,
    field("💰", "Setoran", formatRupiah(dashboard.group.amountPerPeriod)),
    "📸 Setelah transfer, kirim *foto bukti bayar* di chat ini ya.",
  );
}

async function handleGiliran(userId: string, membership: Membership) {
  if (membership.role === "admin") {
    return beginManageGiliran(userId, membership.arisanGroupId);
  }

  const giliran = await getGiliranData(membership.arisanGroupId);

  if (!giliran) {
    return "⚠️ Data arisan tidak ditemukan.";
  }

  const order =
    giliran.members.length > 0
      ? giliran.members
          .map((member, index) => {
            const mark = member.isCurrentDraw ? " ⭐" : "";
            return `${index + 1}. ${member.displayName}${mark}`;
          })
          .join("\n")
      : "Belum ada anggota.";

  return compose(
    header("🎲", "Giliran", giliran.group.name),
    [
      field("📅", "Periode", giliran.activePeriod?.name ?? "Belum ada"),
      field("⭐", "Giliran sekarang", giliran.currentDrawName ?? "Belum diatur"),
    ].join("\n"),
    `${italic("Urutan:")}\n${order}`,
    footer("Giliran diatur oleh admin."),
  );
}

async function handleRiwayat(userId: string, membership: Membership) {
  const history = await getMemberPaymentHistory(membership.arisanGroupId, userId);

  if (!history) {
    return "⚠️ Data arisan tidak ditemukan.";
  }

  if (history.payments.length === 0) {
    return compose(
      header("📜", "Riwayat Bayar", history.group.name),
      "Belum ada riwayat pembayaran.",
      "📸 Kirim foto bukti transfer untuk mulai mencatat.",
    );
  }

  const rows = history.payments
    .slice(0, 10)
    .map(
      (payment) =>
        `• ${payment.periodName}: ${
          payment.amount ? formatRupiah(payment.amount) : "-"
        } (${paymentStatusLabel(payment.status)})`,
    )
    .join("\n");

  return compose(
    header("📜", "Riwayat Bayar", history.group.name),
    [
      field("✅", "Sudah dikonfirmasi", `${history.confirmedCount}x`),
      field("💰", "Total", formatRupiah(history.totalPaid)),
    ].join("\n"),
    rows,
    linkBlock("Selengkapnya:", `/app/arisan/${membership.arisanGroupId}/riwayat`),
  );
}

export async function handleWhatsAppCommand(input: {
  command: WhatsAppCommand;
  userId: string;
}): Promise<WhatsAppReply> {
  const { userId } = input;
  const memberships = await getUserMemberships(userId);

  const withArisan = async <T = string>(
    scope: "admin" | "any",
    run: (membership: Membership) => Promise<T>,
  ): Promise<T | string> => {
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
      const ownerHint = ownerHintFor(await isOwnerUserId(userId));

      if (memberships.length === 0) {
        return ownerHint
          ? compose(header("📋", "Menu Owner"), ownerHint)
          : joinHelp();
      }

      if (memberships.length === 1) {
        const role = memberships[0].role;
        return compose(
          header(
            "📋",
            role === "admin" ? "Menu Admin" : "Menu Anggota",
            memberships[0].arisanName,
          ),
          menuBody(role),
          ownerHint,
        );
      }

      const active = await getActiveMembership(userId, memberships);

      if (!active) {
        return promptArisanSelection(userId, memberships, { name: "menu" });
      }

      return compose(
        header(
          "📋",
          active.role === "admin" ? "Menu Admin" : "Menu Anggota",
          `${active.arisanName} · ${roleLabel(active.role)}`,
        ),
        menuBody(active.role),
        footer("Ketik ARISAN untuk ganti arisan."),
        ownerHint,
      );
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
      return withArisan<WhatsAppReply>("admin", (membership) =>
        beginPaket(userId, membership.arisanGroupId, membership.arisanName),
      );
    case "owner":
      return beginOwnerReview(userId);
    case "pengaturan":
      return withArisan("admin", (membership) =>
        beginPengaturan(userId, membership.arisanGroupId),
      );
    case "dashboard":
      return compose(
        header("📲", "Dashboard"),
        "Buka halaman arisan kamu di sini:",
        dashboardUrl("/app"),
      );
    case "reset-pin":
      return beginResetPin(userId);
  }
}
