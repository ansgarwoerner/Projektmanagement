import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { database?: Database };

export function getDb(): Database {
  if (!globalForDb.database) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL fehlt");
    }
    globalForDb.database = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return globalForDb.database;
}
