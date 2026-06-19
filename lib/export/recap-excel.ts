import "server-only";

import ExcelJS from "exceljs";

import type { RecapExportData } from "@/lib/arisan";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export async function buildRecapExcel(data: RecapExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MyArisan";
  workbook.created = data.generatedAt;

  const sheet = workbook.addWorksheet("Rekap");

  const titleRow = sheet.addRow([`Rekap Arisan - ${data.arisanName}`]);
  titleRow.font = { bold: true, size: 14 };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 4);

  sheet.addRow([`Periode: ${data.periodName ?? "Belum ada"}`]);
  sheet.addRow([`Dibuat: ${formatDateTime(data.generatedAt)}`]);
  sheet.addRow([]);

  sheet.addRow(["Setoran per periode", data.amountPerPeriod]);
  sheet.addRow(["Sudah bayar", data.summary.paidCount]);
  sheet.addRow(["Belum bayar", data.summary.unpaidCount]);
  sheet.addRow(["Menunggu dicek", data.summary.pendingCount]);
  sheet.addRow(["Total terkumpul", data.summary.totalCollected]);
  sheet.addRow(["Giliran bulan ini", data.drawMemberName ?? "Belum diatur"]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(["No", "Nama", "Status", "Nominal", "Tanggal Bayar"]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      fgColor: { argb: "FFE6F4EC" },
      pattern: "solid",
      type: "pattern",
    };
  });

  data.rows.forEach((row, index) => {
    sheet.addRow([
      index + 1,
      row.name,
      row.status,
      row.amount ?? "",
      row.paidAt ? formatDateTime(row.paidAt) : "",
    ]);
  });

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(4).numFmt = '"Rp"#,##0';

  const arrayBuffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(arrayBuffer);
}
