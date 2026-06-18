import "server-only";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function createAuditLog(input: {
  action: string;
  actorUserId: string;
  afterJson?: Record<string, unknown>;
  arisanGroupId: string;
  beforeJson?: Record<string, unknown>;
  entityId: string;
  entityType: "invoice" | "payment" | "subscription";
}) {
  try {
    await db.insert(auditLogs).values(input);
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
