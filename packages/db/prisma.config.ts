import { defineConfig } from "prisma/config";
import { directDatabaseUrl, scopedDatabaseUrl } from "./src/settings";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: process.env.ENGINE_MIGRATIONS_DIR ?? "prisma/migrations" },
  ...(databaseUrl
    ? { datasource: { url: scopedDatabaseUrl(directDatabaseUrl(databaseUrl)) } }
    : {}),
});
