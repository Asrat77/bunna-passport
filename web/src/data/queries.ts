import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { CatalogPage, LeaderboardMetric, LeaderboardScope, OpaqueId, Shop } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";

const CATALOG_KEY = "bunna.catalog";

function cachedCatalog(): Shop[] | undefined {
  try {
    const raw = window.localStorage.getItem(CATALOG_KEY);
    return raw ? (JSON.parse(raw) as Shop[]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The whole live catalog. Addis has hundreds of cafés, not millions, so one
 * request covers it; the last copy is kept so the list paints instantly on
 * the next launch and still works on a bad connection.
 */
export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data } = await api.listShops();
      const shops = (data as CatalogPage).shops.filter((shop) => shop.status === "live");
      try {
        window.localStorage.setItem(CATALOG_KEY, JSON.stringify(shops));
      } catch {
        // Too big or blocked: the network copy still works.
      }
      return shops;
    },
    initialData: cachedCatalog,
    initialDataUpdatedAt: 0,
    staleTime: 10 * 60_000,
  });
}

function useSignedIn() {
  return useAuth().status === "signedIn";
}

export function useProfile() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["profile"], queryFn: async () => (await api.getProfile()).data, enabled });
}

export function usePassport() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["passport"], queryFn: async () => (await api.getPassport()).data, enabled });
}

export function useShop(id: OpaqueId) {
  return useQuery({ queryKey: ["shop", id], queryFn: async () => (await api.getShop(id)).data });
}

export function useReviews(id: OpaqueId, enabled: boolean) {
  return useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => (await api.listReviews(id)).data,
    enabled,
  });
}

/** Recent check-ins, enough to count a weekly streak. */
export function useRecentCheckIns() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["checkIns"], queryFn: async () => (await api.listCheckIns()).data, enabled });
}

export function useLeaderboard(params: {
  scope: LeaderboardScope;
  neighborhoodId?: OpaqueId;
  metric: LeaderboardMetric;
}) {
  return useQuery({
    queryKey: ["leaderboard", params.scope, params.neighborhoodId ?? null, params.metric],
    queryFn: async () =>
      (
        await api.listLeaderboard({
          scope: params.scope,
          neighborhoodId: params.neighborhoodId,
          period: "week",
          metric: params.metric,
        })
      ).data,
    enabled: params.scope === "city" || params.neighborhoodId !== undefined,
  });
}
