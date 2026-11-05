import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENGINE_DEV_SCHEMA, schemaName } from "./settings";

export function renderSchemaMigration(sql: string, schema: string) {
  const target = schemaName(schema, ENGINE_DEV_SCHEMA);
  return sql.replaceAll(`"${ENGINE_DEV_SCHEMA}"`, `"${target}"`);
}

export async function prepareMigrations(source: string, schema: string) {
  if (schemaName(schema, ENGINE_DEV_SCHEMA) === ENGINE_DEV_SCHEMA) {
    return { path: source, cleanup: async () => {} };
  }
  const target = await mkdtemp(join(tmpdir(), "kizashi-engine-migrations-"));
  try {
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.isFile() && entry.name === "migration_lock.toml") {
        await cp(join(source, entry.name), join(target, entry.name));
      } else if (entry.isDirectory()) {
        const migration = await readFile(join(source, entry.name, "migration.sql"), "utf8");
        await mkdir(join(target, entry.name));
        await writeFile(
          join(target, entry.name, "migration.sql"),
          renderSchemaMigration(migration, schema),
        );
      } else {
        throw new Error("Unexpected engine migration artifact.");
      }
    }
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
  return { path: target, cleanup: () => rm(target, { recursive: true, force: true }) };
}
