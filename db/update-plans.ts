import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { UNLIMITED_PROOF_LIMIT } from "../lib/plan-limits";
import { plans } from "./schema";

loadEnvConfig(process.cwd());

// Pushes only the `plans` pricing/limit rows — NO demo data (unlike db/seed.ts).
// Safe to run against the live database. Idempotent upsert on plans.id.
// Run with: npx tsx db/update-plans.ts
const planRows = [
  { featuresJson: { target: "coba-coba" }, id: "free", maxMembers: 5, monthlyProofLimit: 50, name: "Free", price: 0 },
  { featuresJson: { target: "arisan kecil" }, id: "basic", maxMembers: 15, monthlyProofLimit: UNLIMITED_PROOF_LIMIT, name: "Basic", price: 25000 },
  { featuresJson: { target: "arisan normal" }, id: "pro", maxMembers: 30, monthlyProofLimit: UNLIMITED_PROOF_LIMIT, name: "Pro", price: 50000 },
  { featuresJson: { target: "arisan besar" }, id: "premium", maxMembers: 75, monthlyProofLimit: UNLIMITED_PROOF_LIMIT, name: "Premium", price: 100000 },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to update plans.");
  }

  const db = drizzle(neon(databaseUrl));

  await db
    .insert(plans)
    .values(planRows)
    .onConflictDoUpdate({
      target: plans.id,
      set: {
        featuresJson: sql`excluded.features_json`,
        maxMembers: sql`excluded.max_members`,
        monthlyProofLimit: sql`excluded.monthly_proof_limit`,
        name: sql`excluded.name`,
        price: sql`excluded.price`,
        updatedAt: new Date(),
      },
    });

  console.log("Updated plans: Free 50 bukti/bulan, paid plans unlimited.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
