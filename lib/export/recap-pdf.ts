import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { RecapExportData } from "@/lib/arisan";

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

// Helvetica only supports WinAnsi. Replace the few non-WinAnsi characters our
// formatters can emit (e.g. the non-breaking space inside "Rp 100.000") so
// pdf-lib's drawText never throws on encoding.
function toWinAnsi(value: string) {
  return value.replace(/ /g, " ").replace(/[^\x00-\xff]/g, "?");
}

function formatRupiah(amount: number) {
  return toWinAnsi(
    new Intl.NumberFormat("id-ID", {
      currency: "IDR",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amount),
  );
}

function formatDateTime(date: Date) {
  return toWinAnsi(
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(date),
  );
}

const columns = [
  { key: "no", label: "No", width: 36 },
  { key: "name", label: "Nama", width: 200 },
  { key: "status", label: "Status", width: 130 },
  { key: "amount", label: "Nominal", width: 133 },
] as const;

export async function buildRecapPdf(data: RecapExportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ink = rgb(0.09, 0.09, 0.11);
  const muted = rgb(0.42, 0.42, 0.46);
  const line = rgb(0.85, 0.85, 0.88);

  const drawText = (
    text: string,
    x: number,
    yy: number,
    size: number,
    bold = false,
    color = ink,
  ) => {
    page.drawText(toWinAnsi(text), {
      color,
      font: bold ? fontBold : font,
      size,
      x,
      y: yy,
    });
  };

  drawText("Rekap Arisan", MARGIN, y, 20, true);
  y -= 26;
  drawText(data.arisanName, MARGIN, y, 14, true);
  y -= 18;
  drawText(`Periode: ${data.periodName ?? "Belum ada"}`, MARGIN, y, 11, false, muted);
  y -= 14;
  drawText(
    `Dibuat: ${formatDateTime(data.generatedAt)}`,
    MARGIN,
    y,
    11,
    false,
    muted,
  );
  y -= 26;

  const summaryLines = [
    `Setoran per periode: ${formatRupiah(data.amountPerPeriod)}`,
    `Sudah bayar: ${data.summary.paidCount} / ${data.summary.memberCount}`,
    `Belum bayar: ${data.summary.unpaidCount}`,
    `Menunggu dicek: ${data.summary.pendingCount}`,
    `Total terkumpul: ${formatRupiah(data.summary.totalCollected)}`,
    `Giliran bulan ini: ${data.drawMemberName ?? "Belum diatur"}`,
  ];

  for (const summaryLine of summaryLines) {
    drawText(summaryLine, MARGIN, y, 11);
    y -= 16;
  }

  y -= 10;

  // Table header
  const drawRow = (
    cells: { no: string; name: string; status: string; amount: string },
    bold = false,
  ) => {
    let x = MARGIN;

    for (const column of columns) {
      drawText(cells[column.key], x, y, 10, bold);
      x += column.width;
    }
  };

  drawRow({ amount: "Nominal", name: "Nama", no: "No", status: "Status" }, true);
  y -= 6;
  page.drawLine({
    color: line,
    end: { x: PAGE_WIDTH - MARGIN, y },
    start: { x: MARGIN, y },
    thickness: 1,
  });
  y -= 16;

  data.rows.forEach((row, index) => {
    if (y < MARGIN + 40) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    drawRow({
      amount: row.amount !== null ? formatRupiah(row.amount) : "-",
      name: row.name,
      no: String(index + 1),
      status: row.status,
    });
    y -= 16;
  });

  if (data.rows.length === 0) {
    drawText("Belum ada anggota.", MARGIN, y, 10, false, muted);
  }

  return pdf.save();
}
