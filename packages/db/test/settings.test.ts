import { expect, test } from "bun:test";
import { renderSchemaMigration } from "../src/migration-files";
import { directDatabaseUrl, ENGINE_DEV_SCHEMA, scopedDatabaseUrl } from "../src/settings";

function connection(hostname: string) {
  const url = new URL(`postgresql://${hostname}/postgres?sslmode=require`);
  url.username = crypto.randomUUID();
  url.password = crypto.randomUUID();
  return url;
}

test("one Prisma pooled URL supplies the documented direct endpoint without changing credentials", () => {
  const original = connection("pooled.db.prisma.io");
  const direct = new URL(directDatabaseUrl(original.toString()));
  expect(direct.hostname).toBe("db.prisma.io");
  expect(direct.username).toBe(original.username);
  expect(direct.password).toBe(original.password);
  expect(direct.pathname).toBe(original.pathname);
  expect(direct.search).toBe(original.search);
  expect(original.hostname).toBe("pooled.db.prisma.io");
});

test("development schema isolation replaces an input schema without changing the server", () => {
  const original = connection("db.prisma.io");
  original.searchParams.set("schema", "engine");
  const scoped = new URL(scopedDatabaseUrl(original.toString()));
  expect(scoped.searchParams.get("schema")).toBe(ENGINE_DEV_SCHEMA);
  expect(scoped.hostname).toBe(original.hostname);
  expect(scopedDatabaseUrl(scoped.toString())).toBe(scoped.toString());
});

test("direct endpoints are preserved, while unencrypted or non-PostgreSQL URLs fail", () => {
  const original = connection("db.prisma.io");
  expect(directDatabaseUrl(original.toString())).toBe(original.toString());
  original.searchParams.delete("sslmode");
  expect(() => directDatabaseUrl(original.toString())).toThrow("require TLS");
  expect(() => scopedDatabaseUrl("https://db.prisma.io")).toThrow("PostgreSQL");
});

test("schema-specific migrations preserve the existing development SQL and reject unsafe names", () => {
  const sql = 'CREATE TABLE "engine_dev_e0e1"."runs" (id UUID);';
  expect(renderSchemaMigration(sql, ENGINE_DEV_SCHEMA)).toBe(sql);
  expect(renderSchemaMigration(sql, "engine")).toBe('CREATE TABLE "engine"."runs" (id UUID);');
  expect(() => renderSchemaMigration(sql, 'engine"; DROP SCHEMA public;--')).toThrow();
});
