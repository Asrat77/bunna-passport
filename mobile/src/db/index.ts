import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "bunna.db";

let handle: SQLite.SQLiteDatabase | null = null;

/**
 * The local Addis catalog. Mobile data in Ethiopia is expensive and patchy
 * (docs/SPEC.md §6), so the client holds the whole dataset and syncs deltas.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    name_am TEXT NOT NULL,
    slug TEXT NOT NULL,
    search_key TEXT NOT NULL,
    neighborhood_id INTEGER NOT NULL,
    landmark TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status TEXT NOT NULL,
    price_band TEXT,
    attributes TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS neighborhoods (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    name_am TEXT NOT NULL
  );

  -- Mirrors GET /passport so the passport and "not stamped yet" filter work
  -- offline. Server-owned: never written except from a sync or a check-in.
  CREATE TABLE IF NOT EXISTS stamps (
    shop_id INTEGER PRIMARY KEY NOT NULL,
    earned_at TEXT NOT NULL
  );

  -- Check-ins accepted by the user but not yet acknowledged by the server.
  -- The idempotency key makes replaying these safe (docs/SPEC.md §8).
  CREATE TABLE IF NOT EXISTS pending_check_ins (
    idempotency_key TEXT PRIMARY KEY NOT NULL,
    shop_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy_meters INTEGER NOT NULL,
    mock_location INTEGER NOT NULL DEFAULT 0,
    drink TEXT,
    rating INTEGER,
    note TEXT,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_shops_location ON shops (latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_shops_neighborhood ON shops (neighborhood_id);
  CREATE INDEX IF NOT EXISTS idx_shops_search ON shops (search_key);
  `,
];

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (handle) return handle;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  const { user_version: version = 0 } =
    (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version")) ?? {};

  for (let index = version; index < MIGRATIONS.length; index++) {
    await db.execAsync(MIGRATIONS[index]);
  }
  if (version < MIGRATIONS.length) {
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  }

  handle = db;
  return db;
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ value: string | null }>(
    "SELECT value FROM meta WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string | null): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

/** Wipes user-scoped rows on sign-out. The shop catalog is public and stays. */
export async function clearUserData(): Promise<void> {
  const db = await openDatabase();
  await db.execAsync("DELETE FROM stamps; DELETE FROM pending_check_ins;");
  await setMeta(META_KEYS.passportSyncedAt, null);
}

export const META_KEYS = {
  catalogSyncedUntil: "catalog.synced_until",
  catalogEtag: "catalog.etag",
  catalogSyncedAt: "catalog.synced_at",
  passportSyncedAt: "passport.synced_at",
} as const;
