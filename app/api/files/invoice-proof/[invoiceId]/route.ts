import { and, eq, ne } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { invoices, memberships } from "@/db/schema";
import { getSessionUserId } from "@/lib/auth/session";
import { isOwnerUserId } from "@/lib/owner";
import {
  getPublicStorageUrl,
  getR2Object,
  isLocalUploadPath,
} from "@/lib/storage";

// Serves a package-invoice proof image. Mirrors the member payment-proof route:
// R2 objects (private bucket, no public base URL) are streamed through here
// after an auth check, so the proof renders on the owner dashboard and the
// admin's invoice page regardless of storage driver. Visible to the MyArisan
// owner and to admins of the invoice's arisan only.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId } = await params;
  const [invoice] = await db
    .select({
      arisanGroupId: invoices.arisanGroupId,
      proofImageUrl: invoices.proofImageUrl,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice?.proofImageUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.arisanGroupId, invoice.arisanGroupId),
        ne(memberships.joinStatus, "removed"),
      ),
    )
    .limit(1);

  const canAccess =
    membership?.role === "admin" || (await isOwnerUserId(userId));

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isLocalUploadPath(invoice.proofImageUrl)) {
    return NextResponse.redirect(new URL(invoice.proofImageUrl, request.url));
  }

  const publicUrl = getPublicStorageUrl(invoice.proofImageUrl);

  if (publicUrl) {
    return NextResponse.redirect(publicUrl);
  }

  try {
    const object = await getR2Object(invoice.proofImageUrl);
    const body = object.Body;

    if (!body || !("transformToWebStream" in body)) {
      return NextResponse.json({ error: "File not readable" }, { status: 404 });
    }

    return new Response(body.transformToWebStream(), {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Type": object.ContentType ?? "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Failed to serve invoice proof", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
