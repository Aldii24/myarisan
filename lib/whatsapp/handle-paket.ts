import "server-only";

import { formatDateTimeLabel, formatRupiah } from "@/lib/arisan";
import {
  attachInvoiceProof,
  createPackageInvoice,
  getOpenPackageInvoice,
} from "@/lib/payments/package-invoice";
import { getPackageStatus, getPaidPlans } from "@/lib/subscription";

import { getWhatsAppConfig, reportMissingWhatsAppEnv } from "./config";
import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { bold, compose, field, footer, header, italic } from "./format";

const cancelKeywords = new Set(["batal", "cancel", "selesai", "tidak", "no"]);

type PaketPlanItem = {
  id: string;
  name: string;
  price: number;
  maxMembers: number;
  monthlyProofLimit: number;
};

type PaketData = {
  arisanId: string;
  arisanName: string;
  step: "select_plan" | "await_proof";
  plans: PaketPlanItem[];
  invoiceId?: string;
  planName?: string;
  amount?: number;
};

function getAppUrl() {
  reportMissingWhatsAppEnv(["NEXT_PUBLIC_APP_URL"], "links");

  return getWhatsAppConfig().appUrl;
}

function qrisImageUrl() {
  return process.env.NEXT_PUBLIC_MANUAL_QRIS_IMAGE_URL?.trim() || null;
}

function renderPlanList(plans: PaketPlanItem[]) {
  return plans
    .map(
      (plan, index) =>
        `${index + 1}. ${plan.name} - ${formatRupiah(plan.price)} (${
          plan.maxMembers
        } anggota, ${plan.monthlyProofLimit} bukti/bulan)`,
    )
    .join("\n");
}

function selectPrompt(data: PaketData, prefix?: string) {
  return compose(
    prefix ?? null,
    header("💎", "Pilih Paket", data.arisanName),
    renderPlanList(data.plans),
    footer("Balas NOMOR paket untuk lanjut bayar, atau BATAL untuk berhenti."),
  );
}

function proofPrompt(data: PaketData) {
  const qris = qrisImageUrl();
  const qrisLine = qris
    ? `📷 ${italic("QRIS MyArisan:")}\n${qris}`
    : `📷 ${italic("Buka QRIS di dashboard:")}\n${getAppUrl()}/app/arisan/${data.arisanId}/paket/invoices/${data.invoiceId}`;

  return compose(
    header("🧾", "Tagihan Dibuat", data.planName),
    field("💰", "Nominal", `${formatRupiah(data.amount ?? 0)} (aktif 30 hari)`),
    qrisLine,
    "📸 Setelah transfer, kirim *foto bukti pembayaran* di chat ini. Paket aktif setelah dicek owner MyArisan.",
    footer("Ketik BATAL untuk berhenti."),
  );
}

async function loadPlans(): Promise<PaketPlanItem[]> {
  const plans = await getPaidPlans();

  return plans.map((plan) => ({
    id: plan.id,
    maxMembers: plan.maxMembers,
    monthlyProofLimit: plan.monthlyProofLimit,
    name: plan.name,
    price: plan.price,
  }));
}

// Entry point from the `paket` command for a single-arisan admin. Shows the
// current package status, then either resumes an open invoice awaiting proof or
// starts the plan-selection step.
export async function beginPaket(
  userId: string,
  arisanId: string,
  arisanName: string,
) {
  const status = await getPackageStatus(arisanId);
  const statusSummary = compose(
    header("💎", "Paket", arisanName),
    [
      field("📦", "Paket saat ini", status.currentPlan.name),
      field("📌", "Status", status.status),
      field("👥", "Anggota", `${status.memberUsed}/${status.memberLimit}`),
      field("📸", "Baca bukti", `${status.proofUsed}/${status.proofLimit}`),
      field("📅", "Aktif sampai", formatDateTimeLabel(status.activeUntil)),
    ].join("\n"),
  );

  const plans = await loadPlans();

  if (plans.length === 0) {
    return compose(
      statusSummary,
      `Belum ada paket berbayar yang bisa dipilih.\n📲 Buka dashboard: ${getAppUrl()}/app/arisan/${arisanId}/paket`,
    );
  }

  const openInvoice = await getOpenPackageInvoice(arisanId);

  if (openInvoice) {
    const plan = plans.find((item) => item.id === openInvoice.planId);

    await setPendingAction(userId, "manage_package", {
      amount: openInvoice.amount,
      arisanId,
      arisanName,
      invoiceId: openInvoice.id,
      planName: plan?.name ?? "Paket",
      plans,
      step: "await_proof",
    } satisfies PaketData);

    return compose(
      statusSummary,
      `🧾 Masih ada tagihan ${bold(plan?.name ?? "paket")} yang belum dibayar (${formatRupiah(
        openInvoice.amount,
      )}).`,
      "📸 Kirim *foto bukti pembayaran* di chat ini untuk menyelesaikannya.",
      footer("Ketik BATAL untuk berhenti."),
    );
  }

  await setPendingAction(userId, "manage_package", {
    arisanId,
    arisanName,
    plans,
    step: "select_plan",
  } satisfies PaketData);

  return selectPrompt(
    {
      arisanId,
      arisanName,
      plans,
      step: "select_plan",
    },
    statusSummary,
  );
}

export async function handlePaketInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const data = state.data as PaketData;
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "👍 Oke, dihentikan. Ketik PAKET kapan saja untuk atur paket lagi.";
  }

  if (data.step === "await_proof") {
    return "📸 Kirim *foto bukti pembayaran* paket di chat ini, atau ketik BATAL untuk berhenti.";
  }

  // step === "select_plan"
  const choice = Number(trimmed.replace(/\D/g, ""));

  if (!Number.isInteger(choice) || choice < 1 || choice > data.plans.length) {
    return `⚠️ Balas dengan nomor 1 sampai ${data.plans.length}, atau ketik BATAL untuk berhenti.`;
  }

  const selected = data.plans[choice - 1];
  const result = await createPackageInvoice({
    actorUserId: userId,
    arisanId: data.arisanId,
    planId: selected.id,
  });

  if (!result.ok) {
    await clearPendingAction(userId);
    return result.error;
  }

  const nextData: PaketData = {
    ...data,
    amount: result.amount,
    invoiceId: result.invoiceId,
    planName: result.planName,
    step: "await_proof",
  };

  await setPendingAction(userId, "manage_package", nextData);

  return proofPrompt(nextData);
}

// Routed here from the image dispatcher when an admin is mid-paket flow
// (await_proof). Attaches the photo to the open invoice and ends the flow.
export async function handlePaketProofImage(input: {
  userId: string;
  file: File;
  state: PendingActionState;
}) {
  const data = input.state.data as PaketData;

  if (data.step !== "await_proof" || !data.invoiceId) {
    return "⚠️ Belum ada tagihan paket yang menunggu bukti. Ketik PAKET untuk mulai.";
  }

  const result = await attachInvoiceProof({
    actorUserId: input.userId,
    arisanId: data.arisanId,
    file: input.file,
    invoiceId: data.invoiceId,
  });

  if (!result.ok) {
    if (result.code === "invalid_file") {
      // Keep the flow open so the admin can resend a valid image.
      return result.error;
    }

    await clearPendingAction(input.userId);
    return result.error;
  }

  await clearPendingAction(input.userId);

  return compose(
    header("✅", "Bukti Paket Terkirim", data.planName ?? undefined),
    "Bukti pembayaran berhasil dikirim. Paket akan aktif setelah dicek owner MyArisan.",
    `📲 ${italic("Cek status:")}\n${getAppUrl()}/app/arisan/${data.arisanId}/paket`,
  );
}
