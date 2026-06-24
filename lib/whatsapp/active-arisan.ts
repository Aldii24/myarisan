import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import type { getUserMemberships } from "@/lib/auth/user";

import type { WhatsAppCommand } from "./command-parser";
import { setPendingAction } from "./conversation-state";

type Membership = Awaited<ReturnType<typeof getUserMemberships>>[number];

// What a multi-arisan user is choosing between. The originating command is kept
// so it can be re-run for the picked arisan once the user replies with a number.
export type SelectArisanCandidate = {
  arisanGroupId: string;
  arisanName: string;
  role: string;
};

export type SelectArisanData = {
  command: WhatsAppCommand;
  candidates: SelectArisanCandidate[];
};

export type ResolveArisanResult =
  | { kind: "ok"; membership: Membership }
  | { kind: "none"; reply: string }
  | { kind: "prompt"; reply: string };

export function roleLabel(role: string) {
  return role === "admin" ? "admin" : "anggota";
}

export async function getActiveArisanId(userId: string) {
  const [user] = await db
    .select({ activeArisanId: users.activeArisanId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.activeArisanId ?? null;
}

export async function setActiveArisan(userId: string, arisanGroupId: string) {
  await db
    .update(users)
    .set({ activeArisanId: arisanGroupId })
    .where(eq(users.id, userId));
}

function toCandidates(memberships: Membership[]): SelectArisanCandidate[] {
  return memberships.map((membership) => ({
    arisanGroupId: membership.arisanGroupId,
    arisanName: membership.arisanName,
    role: membership.role,
  }));
}

export function buildSelectPrompt(candidates: SelectArisanCandidate[]) {
  const list = candidates
    .map(
      (candidate, index) =>
        `${index + 1}. ${candidate.arisanName} (${roleLabel(candidate.role)})`,
    )
    .join("\n");

  return `Kamu punya beberapa arisan. Balas dengan nomor arisan:
${list}`;
}

// Stores the selection flow and returns the numbered prompt. Used both by the
// resolver (when a context command needs a target) and by the ARISAN/menu
// switch flows (with command = { name: "menu" }).
export async function promptArisanSelection(
  userId: string,
  memberships: Membership[],
  command: WhatsAppCommand,
) {
  const candidates = toCandidates(memberships);

  await setPendingAction(userId, "select_arisan", {
    candidates,
    command,
  } satisfies SelectArisanData);

  return buildSelectPrompt(candidates);
}

// Decides which arisan a command should run against:
// - no eligible arisan -> a helpful message (join / admin-only)
// - exactly one        -> use it
// - many               -> use the sticky active arisan if it is eligible,
//                         otherwise start the numbered selection flow.
export async function resolveArisanContext(input: {
  userId: string;
  memberships: Membership[];
  scope: "admin" | "any";
  command: WhatsAppCommand;
}): Promise<ResolveArisanResult> {
  const { userId, memberships, scope, command } = input;

  if (memberships.length === 0) {
    return {
      kind: "none",
      reply: "Kamu belum masuk ke arisan. Ketik JOIN <kode> untuk mulai.",
    };
  }

  const candidates =
    scope === "admin"
      ? memberships.filter((membership) => membership.role === "admin")
      : memberships;

  if (candidates.length === 0) {
    return { kind: "none", reply: "Perintah ini hanya untuk admin arisan." };
  }

  if (candidates.length === 1) {
    return { kind: "ok", membership: candidates[0] };
  }

  const activeArisanId = await getActiveArisanId(userId);
  const active = candidates.find(
    (membership) => membership.arisanGroupId === activeArisanId,
  );

  if (active) {
    return { kind: "ok", membership: active };
  }

  return {
    kind: "prompt",
    reply: await promptArisanSelection(userId, candidates, command),
  };
}
