import { existsSync } from "node:fs";
import { join } from "node:path";

// The repo keeps one .env at its root (REPO-STRUCTURE §6); Next.js only reads apps/web/.env*.
// loadEnvFile never overrides variables already set by the shell, CI or Vercel.
const ROOT_ENV_FILE = join(process.cwd(), "..", "..", ".env");

if (existsSync(ROOT_ENV_FILE)) {
  process.loadEnvFile(ROOT_ENV_FILE);
}
