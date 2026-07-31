import { api } from "@/api/client";
import { ApiRequestError, NetworkError } from "@/api/errors";
import { getMeta, META_KEYS, setMeta } from "@/db/index";
import { applyTombstones, countShops, upsertShops } from "@/db/shops";

export type SyncOutcome =
  | { status: "updated"; shops: number; removed: number }
  | { status: "unchanged" }
  | { status: "offline" }
  | { status: "failed"; message: string };

let inFlight: Promise<SyncOutcome> | null = null;

/**
 * Incremental catalog sync (docs/SPEC.md §10).
 *
 * The first run pulls the whole Addis catalog; every run after sends
 * `updated_since` plus the stored ETag, so an unchanged catalog costs a single
 * 304. `sync_until` is the server's captured cutoff — using it rather than the
 * device clock avoids dropping records written during the request.
 */
export async function syncCatalog(options: { force?: boolean } = {}): Promise<SyncOutcome> {
  // Collapse concurrent callers (tab focus + reconnect) onto one request.
  if (inFlight) return inFlight;

  inFlight = performSync(options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function performSync({ force = false }: { force?: boolean }): Promise<SyncOutcome> {
  const syncedUntil = await getMeta(META_KEYS.catalogSyncedUntil);
  const etag = force ? null : await getMeta(META_KEYS.catalogEtag);

  try {
    const response = await api.listShops({
      updatedSince: syncedUntil ?? undefined,
      etag,
    });

    if (response.notModified) {
      await setMeta(META_KEYS.catalogSyncedAt, new Date().toISOString());
      return { status: "unchanged" };
    }

    const { shops = [], tombstones = [] } = response.data ?? {};
    await upsertShops(shops);
    await applyTombstones(tombstones);

    const cutoff = (response.meta?.sync_until as string | undefined) ?? null;
    if (cutoff) await setMeta(META_KEYS.catalogSyncedUntil, cutoff);
    await setMeta(META_KEYS.catalogEtag, response.etag);
    await setMeta(META_KEYS.catalogSyncedAt, new Date().toISOString());

    return { status: "updated", shops: shops.length, removed: tombstones.length };
  } catch (error) {
    if (error instanceof NetworkError) return { status: "offline" };
    if (error instanceof ApiRequestError) {
      // A rejected cursor or ETag would otherwise wedge sync permanently.
      if (error.status === 400) {
        await setMeta(META_KEYS.catalogSyncedUntil, null);
        await setMeta(META_KEYS.catalogEtag, null);
      }
      return { status: "failed", message: error.message };
    }
    throw error;
  }
}

/** True when the device has never successfully pulled the catalog. */
export async function needsBootstrap(): Promise<boolean> {
  return (await countShops()) === 0;
}

export async function lastSyncedAt(): Promise<Date | null> {
  const value = await getMeta(META_KEYS.catalogSyncedAt);
  return value ? new Date(value) : null;
}
