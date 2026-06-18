import { and, eq, ne } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { memberships, payments } from "@/db/schema";
import { getSessionUserId } from "@/lib/auth/session";
import {
  getPublicStorageUrl,
  getR2Object,
  isLocalUploadPath,
} from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paymentId } = await params;
  const [payment] = await db
    .select({
      arisanGroupId: payments.arisanGroupId,
      memberUserId: payments.memberUserId,
      proofImageUrl: payments.proofImageUrl,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment?.proofImageUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const [membership] = await db
    .select({
      role: memberships.role,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.arisanGroupId, payment.arisanGroupId),
        ne(memberships.joinStatus, "removed"),
      ),
    )
    .limit(1);

  const canAccess =
    membership?.role === "admin" ||
    (membership?.role === "member" && payment.memberUserId === userId);

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isLocalUploadPath(payment.proofImageUrl)) {
    return NextResponse.redirect(new URL(payment.proofImageUrl, request.url));
  }

  const publicUrl = getPublicStorageUrl(payment.proofImageUrl);

  if (publicUrl) {
    return NextResponse.redirect(publicUrl);
  }

  try {
    const object = await getR2Object(payment.proofImageUrl);
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
    console.error("Failed to serve payment proof", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
