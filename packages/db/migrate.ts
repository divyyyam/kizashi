import { join } from "node:path";
import { prepareMigrations } from "./src/migration-files";
import { directDatabaseUrl, engineSchema, scopedDatabaseUrl } from "./src/settings";

const MIGRATION_TIMEOUT_MS = 60_000;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for development migrations.");
const schema = engineSchema();
const scopedUrl = scopedDatabaseUrl(directDatabaseUrl(databaseUrl), schema);
const migrations = await prepareMigrations(join(import.meta.dir, "prisma/migrations"), schema);
try {
  const child = Bun.spawn(
    [process.execPath, "--bun", "node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      cwd: import.meta.dir,
      env: { ...process.env, DATABASE_URL: scopedUrl, ENGINE_MIGRATIONS_DIR: migrations.path },
      stdout: "pipe",
      stderr: "pipe",
      timeout: MIGRATION_TIMEOUT_MS,
    },
  );
  // Prisma CLI diagnostics can contain database host details; never forward them.
  const [output] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const completed =
    /All migrations have been successfully applied|No pending migrations to apply/.test(output);
  if ((await child.exited) !== 0 || !completed)
    throw new Error("Development database migration failed; connection details withheld.");
  process.stdout.write(`Migrations applied to ${schema}.\n`);
} finally {
  await migrations.cleanup();
}
