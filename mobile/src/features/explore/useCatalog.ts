import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinate } from "@/location/distance";
import { listShops, searchShops, type CachedShop } from "@/db/shops";
import { lastSyncedAt, syncCatalog, type SyncOutcome } from "@/sync/catalog";

type CatalogState = {
  shops: CachedShop[];
  loading: boolean;
  syncing: boolean;
  syncedAt: Date | null;
  online: boolean;
  lastOutcome: SyncOutcome | null;
};

/**
 * Reads always come from SQLite; the network only ever refreshes it. That is
 * what makes every Explore state work offline (docs/DESIGN.md §7).
 */
export function useCatalog(options: {
  query: string;
  origin: Coordinate | null;
  onlyUnstamped: boolean;
}) {
  const { query, origin, onlyUnstamped } = options;

  const [state, setState] = useState<CatalogState>({
    shops: [],
    loading: true,
    syncing: false,
    syncedAt: null,
    online: true,
    lastOutcome: null,
  });

  const read = useCallback(async () => {
    const trimmed = query.trim();
    const shops = trimmed
      ? await searchShops(trimmed, origin)
      : await listShops({ origin, onlyUnstamped });
    setState((previous) => ({ ...previous, shops, loading: false }));
  }, [query, origin, onlyUnstamped]);

  useEffect(() => {
    void read();
  }, [read]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      setState((previous) => ({
        ...previous,
        online: netState.isConnected !== false,
      }));
    });
    return unsubscribe;
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      setState((previous) => ({ ...previous, syncing: true }));
      const outcome = await syncCatalog({ force });
      const syncedAt = await lastSyncedAt();
      setState((previous) => ({
        ...previous,
        syncing: false,
        syncedAt,
        lastOutcome: outcome,
        online: outcome.status !== "offline",
      }));
      if (outcome.status === "updated") await read();
    },
    [read],
  );

  // One sync attempt per mount, deliberately not re-run when the query or
  // filters change — mobile data here is expensive, and a keystroke must never
  // cost a network round-trip. Failure is silent: cached shops still render.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void refresh();
  }, [refresh]);

  return { ...state, refresh, reload: read };
}
