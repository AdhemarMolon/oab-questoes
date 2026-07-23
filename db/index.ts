import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { schema as databaseSchema } from "./schema";

export function createDatabase(databaseUrl: string) {
  const normalizedUrl = databaseUrl.trim();

  if (!normalizedUrl) {
    throw new Error("DATABASE_URL is required to create the database client.");
  }

  const client = neon(normalizedUrl);
  return drizzle(client, { schema: databaseSchema });
}

export type Database = ReturnType<typeof createDatabase>;

const globalForDatabase = globalThis as typeof globalThis & {
  __oabQuestoesDatabase?: Database;
};

export function getDb(): Database {
  if (globalForDatabase.__oabQuestoesDatabase) {
    return globalForDatabase.__oabQuestoesDatabase;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Add it to the server environment before using the database.",
    );
  }

  const database = createDatabase(databaseUrl);
  globalForDatabase.__oabQuestoesDatabase = database;
  return database;
}

// The proxy delays reading DATABASE_URL until the first real database access.
// This keeps lint, typecheck and static builds from failing merely by importing
// modules that declare server-side services.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb();
    const value = Reflect.get(database, property, database) as unknown;

    return typeof value === "function" ? value.bind(database) : value;
  },
});

export * from "./schema";
