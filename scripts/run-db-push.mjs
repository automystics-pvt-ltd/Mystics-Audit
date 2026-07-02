#!/usr/bin/env node
/**
 * Reads DATABASE_URL from .env.production and runs drizzle-kit push --force
 * Bypasses bash quoting issues with special characters in passwords.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Read .env.production
const envPath = resolve(root, ".env.production");
let dbUrl;
try {
  const content = readFileSync(envPath, "utf8");
  const match = content.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error("DATABASE_URL not found in .env.production");
  dbUrl = match[1].trim().replace(/^["']|["']$/g, "");
  console.log("✅ Found DATABASE_URL in .env.production");
} catch (e) {
  // Fallback to environment variable
  dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not found in .env.production or environment");
    process.exit(1);
  }
  console.log("✅ Using DATABASE_URL from environment");
}

// Test connection first
console.log("🔌 Testing DB connection...");
try {
  const { default: pg } = await import("pg");
  const Pool = pg.Pool || pg.default?.Pool;
  const pool = new (Pool || pg)({ connectionString: dbUrl });
  await pool.query("SELECT 1");
  await pool.end();
  console.log("✅ Database connection OK");
} catch (e) {
  console.error("❌ DB connection failed:", e.message);
  process.exit(1);
}

// Run drizzle-kit push --force from lib/db directory
const drizzleKit = resolve(root, "node_modules/.bin/drizzle-kit");
const libDb = resolve(root, "lib/db");

console.log("🚀 Running drizzle-kit push --force...");
try {
  execSync(`${drizzleKit} push --force --config drizzle.config.ts`, {
    cwd: libDb,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
  });
  console.log("✅ Schema pushed successfully!");
} catch (e) {
  console.error("❌ drizzle-kit push failed:", e.message);
  process.exit(1);
}
