import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Neon PostgreSQL.");
  }

  return databaseUrl;
}

const sql = neon(getDatabaseUrl());

export const db = drizzle(sql, { schema });
export { schema };
