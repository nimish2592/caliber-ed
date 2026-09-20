import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { appConfig } from "../config";
import { seedDatabase } from "./seed";

type QueryResult<T> = { rows: T[] };

export type DbClient = {
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<QueryResult<T>>;
  exec: (text: string) => Promise<void>;
};

const globalForDb = globalThis as unknown as {
  heDb?: DbClient;
  heDbReady?: Promise<DbClient>;
};

function schemaSql(): string {
  return readFileSync(path.join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
}

async function createPostgresClient(url: string): Promise<DbClient> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, {
    max: 4,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: "require",
    prepare: false,
  });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = (await sql.unsafe(text, params as never[])) as unknown as T[];
      return { rows };
    },
    async exec(text: string) {
      await sql.unsafe("SET client_min_messages TO WARNING");
      const statements = text
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      for (const statement of statements) {
        await sql.unsafe(statement);
      }
    },
  };
}

async function createPgliteClient(): Promise<DbClient> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".data/pglite");
  mkdirSync(dataDir, { recursive: true });
  const pglite = await PGlite.create({ dataDir });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await pglite.query<T>(text, params);
      return { rows: result.rows ?? [] };
    },
    async exec(text: string) {
      await pglite.exec(text);
    },
  };
}

async function initDb(): Promise<DbClient> {
  const client = appConfig.databaseUrl
    ? await createPostgresClient(appConfig.databaseUrl)
    : await createPgliteClient();

  await client.exec(schemaSql());
  await seedDatabase(client);
  return client;
}

export async function getDb(): Promise<DbClient> {
  if (globalForDb.heDb) return globalForDb.heDb;
  if (!globalForDb.heDbReady) {
    globalForDb.heDbReady = initDb()
      .then((db) => {
        globalForDb.heDb = db;
        return db;
      })
      .catch((err) => {
        globalForDb.heDbReady = undefined;
        throw err;
      });
  }
  return globalForDb.heDbReady;
}

export async function dbQuery<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const result = await db.query<T>(text, params);
  return result.rows;
}

export async function dbOne<T>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await dbQuery<T>(text, params);
  return rows[0] ?? null;
}
