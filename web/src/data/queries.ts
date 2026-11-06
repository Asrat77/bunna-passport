import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { CatalogPage, LeaderboardMetric, LeaderboardScope, OpaqueId, ReviewFilter, ReviewSummary, Shop } from "@/api/types";
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

/** One fetch serves both the review list and its rating summary. */
/**
 * A shop's reviews, a page at a time. The unfiltered first page doubles as
 * the shop's summary, so the café page and its Reviews tab share one request.
 */
function reviewsQuery(id: OpaqueId, filter: ReviewFilter | null) {
  return {
    queryKey: ["reviews", id, filter ?? "all"],
    queryFn: async ({ pageParam }: { pageParam: OpaqueId | undefined }) => {
      const { data, meta } = await api.listReviews(id, { cursor: pageParam, filter: filter ?? undefined });
      return { reviews: data, summary: (meta as ReviewSummary | undefined) ?? null };
    },
    initialPageParam: undefined as OpaqueId | undefined,
    getNextPageParam: (page: { summary: ReviewSummary | null }) => page.summary?.next_cursor ?? undefined,
  };
}

export function useReviews(id: OpaqueId, filter: ReviewFilter | null = null) {
  return useInfiniteQuery({ ...reviewsQuery(id, filter) });
}

/** The score, its breakdown, top tags and typical prices, for the whole shop. */
export function useReviewSummary(id: OpaqueId) {
  return useInfiniteQuery({ ...reviewsQuery(id, null), select: (data) => data.pages[0]?.summary ?? null });
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
    enabled: params.scope !== "neighborhood" || params.neighborhoodId !== undefined,
  });
}

export function useFriends() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["friends"], queryFn: async () => (await api.listFriends()).data, enabled });
}

export function useInvite() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["invite"], queryFn: async () => (await api.getInvite()).data, enabled, staleTime: Infinity });
}

/** Friends' visits, a page at a time. */
export function useFeed() {
  const enabled = useSignedIn();
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: async ({ pageParam }) => {
      const { data, meta } = await api.getFeed(pageParam);
      return { items: data, nextCursor: (meta?.next_cursor as number | null | undefined) ?? undefined };
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
  });
}

/** Reactions friends left on your own visits. */
export function useReceivedReactions() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["reactions"], queryFn: async () => (await api.listReceivedReactions()).data, enabled });
}

export function usePersonalStats() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["stats", "me"], queryFn: async () => (await api.getPersonalStats()).data, enabled });
}

/** The server caches these for ten minutes, so asking more often buys nothing. */
export function useCityStats() {
  return useQuery({
    queryKey: ["stats", "city"],
    queryFn: async () => (await api.getCityStats()).data,
    staleTime: 10 * 60_000,
  });
}
