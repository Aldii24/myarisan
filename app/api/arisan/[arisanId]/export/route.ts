import { NextResponse, type NextRequest } from "next/server";

import { getRecapExportData } from "@/lib/arisan";
import { getMembershipForArisan } from "@/lib/auth/user";
import { getSessionUserId } from "@/lib/auth/session";
import { buildRecapExcel } from "@/lib/export/recap-excel";
import { buildRecapPdf } from "@/lib/export/recap-pdf";
import { getExportCapabilities } from "@/lib/subscription";

export const runtime = "nodejs";

function safeFileName(name: string) {
  const slug = name
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug || "arisan";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ arisanId: string }> },
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { arisanId } = await params;
  const membership = await getMembershipForArisan(userId, arisanId);

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get("format");

  if (format !== "pdf" && format !== "excel") {
    return NextResponse.json(
      { error: "Format harus pdf atau excel." },
      { status: 400 },
    );
  }

  const capabilities = await getExportCapabilities(arisanId);

  if (format === "pdf" && !capabilities.pdf) {
    return NextResponse.json(
      {
        error:
          "Export PDF hanya tersedia untuk paket berbayar. Upgrade paket arisan dulu.",
      },
      { status: 403 },
    );
  }

  if (format === "excel" && !capabilities.excel) {
    return NextResponse.json(
      {
        error:
          "Export Excel hanya tersedia untuk paket Pro atau Premium. Upgrade paket arisan dulu.",
      },
      { status: 403 },
    );
  }

  const data = await getRecapExportData(arisanId);

  if (!data) {
    return NextResponse.json({ error: "Arisan tidak ditemukan." }, { status: 404 });
  }

  const baseName = `rekap-${safeFileName(data.arisanName)}`;

  if (format === "pdf") {
    const bytes = await buildRecapPdf(data);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  }

  const buffer = await buildRecapExcel(data);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
