import type { Shop, ShopTombstone } from "@/api/types";
import { distanceMeters } from "@/location/distance";
import type { StampLevel } from "@/design/components/Seal";
import { openDatabase } from "./index";
import { buildSearchKey, normalizeName } from "./searchKey";

export type CachedShop = {
  id: number;
  name: string;
  name_am: string;
  slug: string;
  neighborhood_id: number;
  neighborhood_name: string;
  neighborhood_name_am: string;
  landmark: string;
  latitude: number;
  longitude: number;
  price_band: string | null;
  attributes: Record<string, boolean>;
  stamped: boolean;
  /** null when unstamped; otherwise how well the visitor knows the shop. */
  stamp_level: StampLevel | null;
  /** Metres from the reference point, when one was supplied. */
  distance: number | null;
};

type ShopRow = Omit<CachedShop, "attributes" | "stamped" | "stamp_level" | "distance"> & {
  attributes: string;
  stamped: number;
  stamp_level: string | null;
};

const SELECT_SHOP = `
  SELECT s.id, s.name, s.name_am, s.slug, s.landmark, s.latitude, s.longitude,
         s.price_band, s.attributes, s.neighborhood_id,
         COALESCE(n.name, '') AS neighborhood_name,
         COALESCE(n.name_am, '') AS neighborhood_name_am,
         CASE WHEN st.shop_id IS NULL THEN 0 ELSE 1 END AS stamped,
         st.level AS stamp_level
  FROM shops s
  LEFT JOIN neighborhoods n ON n.id = s.neighborhood_id
  LEFT JOIN stamps st ON st.shop_id = s.id
  WHERE s.status = 'live'
`;

function hydrate(row: ShopRow): CachedShop {
  return {
    ...row,
    attributes: JSON.parse(row.attributes) as Record<string, boolean>,
    stamped: row.stamped === 1,
    stamp_level: (row.stamp_level as StampLevel | null) ?? null,
    distance: null,
  };
}

export type Origin = { latitude: number; longitude: number } | null;

function withDistance(shops: CachedShop[], origin: Origin): CachedShop[] {
  if (!origin) return shops;
  return shops
    .map((shop) => ({
      ...shop,
      distance: distanceMeters(origin, shop),
    }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

/** Writes a sync page. Shops and neighbourhoods arrive together on the wire. */
export async function upsertShops(shops: Shop[]): Promise<void> {
  if (shops.length === 0) return;
  const db = await openDatabase();

  await db.withTransactionAsync(async () => {
    for (const shop of shops) {
      await db.runAsync(
        `INSERT INTO neighborhoods (id, name, name_am) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, name_am = excluded.name_am`,
        shop.neighborhood.id,
        shop.neighborhood.name,
        shop.neighborhood.name_am,
      );

      await db.runAsync(
        `INSERT INTO shops (
           id, name, name_am, slug, search_key, neighborhood_id, landmark,
           latitude, longitude, status, price_band, attributes, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, name_am = excluded.name_am, slug = excluded.slug,
           search_key = excluded.search_key, neighborhood_id = excluded.neighborhood_id,
           landmark = excluded.landmark, latitude = excluded.latitude,
           longitude = excluded.longitude, status = excluded.status,
           price_band = excluded.price_band, attributes = excluded.attributes,
           updated_at = excluded.updated_at`,
        shop.id,
        shop.name,
        shop.name_am,
        shop.slug,
        buildSearchKey(shop.name, shop.name_am),
        shop.neighborhood.id,
        shop.landmark,
        shop.latitude,
        shop.longitude,
        shop.status,
        shop.price_band,
        JSON.stringify(shop.attributes ?? {}),
        shop.updated_at,
      );
    }
  });
}

/**
 * Removes shops the server has hidden, closed or merged away. Stamps are kept:
 * a merged shop's stamp survives the merge server-side, and the next passport
 * sync is what reconciles it.
 */
export async function applyTombstones(tombstones: ShopTombstone[]): Promise<void> {
  if (tombstones.length === 0) return;
  const db = await openDatabase();
  const ids = tombstones.map((tombstone) => tombstone.id);
  const placeholders = ids.map(() => "?").join(",");
  await db.runAsync(`DELETE FROM shops WHERE id IN (${placeholders})`, ...ids);
}

export async function countShops(): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM shops WHERE status = 'live'",
  );
  return row?.total ?? 0;
}

export async function listShops(options: {
  origin?: Origin;
  limit?: number;
  onlyUnstamped?: boolean;
  neighborhoodId?: number;
} = {}): Promise<CachedShop[]> {
  const { origin = null, limit, onlyUnstamped = false, neighborhoodId } = options;
  const db = await openDatabase();

  const clauses: string[] = [];
  const args: (string | number)[] = [];
  if (onlyUnstamped) clauses.push("st.shop_id IS NULL");
  if (neighborhoodId !== undefined) {
    clauses.push("s.neighborhood_id = ?");
    args.push(neighborhoodId);
  }
  const where = clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "";

  const rows = await db.getAllAsync<ShopRow>(`${SELECT_SHOP}${where}`, ...args);
  const shops = withDistance(rows.map(hydrate), origin);
  // Sorting by distance has to happen across the whole set, so LIMIT is applied
  // here rather than in SQL.
  return limit ? shops.slice(0, limit) : shops;
}

/**
 * Transliteration-tolerant search across both scripts, run against the local
 * cache so it works offline (docs/SPEC.md §6).
 */
export async function searchShops(
  query: string,
  origin: Origin = null,
): Promise<CachedShop[]> {
  const key = normalizeName(query);
  if (key.length === 0) return listShops({ origin });

  const db = await openDatabase();
  const rows = await db.getAllAsync<ShopRow>(
    `${SELECT_SHOP} AND s.search_key LIKE ? ESCAPE '\\'`,
    `%${key.replace(/[\\%_]/g, "\\$&")}%`,
  );
  return withDistance(rows.map(hydrate), origin);
}

export async function findShop(id: number): Promise<CachedShop | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<ShopRow>(`${SELECT_SHOP} AND s.id = ?`, id);
  return row ? hydrate(row) : null;
}

/** Replaces the local stamp mirror with the server's authoritative set. */
export async function replaceStamps(
  stamps: { shopId: number; earnedAt: string; level: StampLevel; checkInsCount: number }[],
): Promise<void> {
  const db = await openDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM stamps");
    for (const stamp of stamps) {
      await db.runAsync(
        "INSERT OR REPLACE INTO stamps (shop_id, earned_at, level, check_ins_count) VALUES (?, ?, ?, ?)",
        stamp.shopId,
        stamp.earnedAt,
        stamp.level,
        stamp.checkInsCount,
      );
    }
  });
}

/**
 * Records a stamp, or raises an existing one. A repeat visit does not create a
 * stamp but does move its level, so the write has to update as well as insert.
 */
export async function recordStamp(
  shopId: number,
  earnedAt: string,
  level: StampLevel = "bronze",
  checkInsCount = 1,
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `INSERT INTO stamps (shop_id, earned_at, level, check_ins_count) VALUES (?, ?, ?, ?)
     ON CONFLICT(shop_id) DO UPDATE SET level = excluded.level,
                                        check_ins_count = excluded.check_ins_count`,
    shopId,
    earnedAt,
    level,
    checkInsCount,
  );
}

export type CachedNeighborhood = { id: number; name: string; name_am: string };

/**
 * Every neighborhood, including the ones with no shops yet. Progress joins
 * through shops and so hides exactly the areas a submission would fill.
 */
export async function listNeighborhoods(): Promise<CachedNeighborhood[]> {
  const db = await openDatabase();
  return db.getAllAsync<CachedNeighborhood>(
    "SELECT id, name, name_am FROM neighborhoods ORDER BY name",
  );
}

export type NeighborhoodProgress = {
  id: number;
  name: string;
  name_am: string;
  total: number;
  stamped: number;
};

/** Powers the completion hook: "You've been to 12 of 47 shops in Bole". */
export async function neighborhoodProgress(): Promise<NeighborhoodProgress[]> {
  const db = await openDatabase();
  return db.getAllAsync<NeighborhoodProgress>(`
    SELECT n.id, n.name, n.name_am,
           COUNT(s.id) AS total,
           SUM(CASE WHEN st.shop_id IS NULL THEN 0 ELSE 1 END) AS stamped
    FROM neighborhoods n
    JOIN shops s ON s.neighborhood_id = n.id AND s.status = 'live'
    LEFT JOIN stamps st ON st.shop_id = s.id
    GROUP BY n.id, n.name, n.name_am
    ORDER BY n.name
  `);
}
