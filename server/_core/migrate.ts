import path from "path";
import fs from "fs";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

/**
 * Applies pending Drizzle migrations (./drizzle/*.sql) at startup so a fresh
 * Coolify deploy needs no manual `pnpm db:push`. Disable with
 * RUN_MIGRATIONS=false.
 */
export async function runMigrations() {
  if (process.env.RUN_MIGRATIONS === "false") return;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[Migrate] DATABASE_URL not set, skipping migrations");
    return;
  }
  const candidates = [
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(import.meta.dirname, "..", "drizzle"),
    path.resolve(import.meta.dirname, "../..", "drizzle"),
  ];
  const migrationsFolder = candidates.find(p =>
    fs.existsSync(path.join(p, "meta", "_journal.json"))
  );
  if (!migrationsFolder) {
    console.warn("[Migrate] No migrations folder found, skipping");
    return;
  }

  // Retry: the database container may still be starting.
  for (let attempt = 1; ; attempt++) {
    let conn: mysql.Connection | undefined;
    try {
      conn = await mysql.createConnection({ uri: url, multipleStatements: true });
      await migrate(drizzle(conn), { migrationsFolder });
      console.log("[Migrate] Database is up to date");
      return;
    } catch (err) {
      if (attempt >= 10) throw err;
      console.warn(`[Migrate] Attempt ${attempt} failed, retrying in 3s:`, (err as Error).message);
      await new Promise(r => setTimeout(r, 3000));
    } finally {
      await conn?.end().catch(() => {});
    }
  }
}
