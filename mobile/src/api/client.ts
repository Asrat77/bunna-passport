import Constants from "expo-constants";
import { ApiRequestError, NetworkError } from "./errors";
import type {
  ApiError,
  AuthenticatedPayload,
  CatalogPage,
  CheckIn,
  CheckInInput,
  Contribution,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardScope,
  OpaqueId,
  Passport,
  Shop,
  ShopDetail,
  SignupInput,
  Timestamp,
  User,
} from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;

const API_PORT = 3000;

/**
 * Where the Rails API lives.
 *
 * A hardcoded host cannot serve every target: an emulator reaches the host
 * machine at 10.0.2.2, a physical phone needs the machine's LAN address, and
 * production is neither. So in development we derive it from the Metro server
 * the app was loaded from — that host is by definition reachable from this
 * device. `EXPO_PUBLIC_API_BASE_URL` overrides it for release builds.
 */
function resolveApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicit) return explicit;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:${API_PORT}/api/v1`;

  // No Metro host means a release build with nothing configured.
  return `http://localhost:${API_PORT}/api/v1`;
}

export const API_BASE_URL: string = resolveApiBaseUrl();

type TokenSource = () => string | null;

let readToken: TokenSource = () => null;

/** Wired once at startup by the auth provider. */
export function setTokenSource(source: TokenSource): void {
  readToken = source;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  /** Send no Authorization header even when signed in. */
  anonymous?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/** Full response so callers can read ETag and distinguish a 304. */
export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
  etag: string | null;
  notModified: boolean;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    query,
    headers = {},
    anonymous = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Propagate an outer cancellation (e.g. the user backing out of check-in).
  const abortOuter = () => controller.abort();
  signal?.addEventListener("abort", abortOuter);

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";

  const token = anonymous ? null : readToken();
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    throw new NetworkError(
      controller.signal.aborted ? "Request timed out" : "Network request failed",
      cause,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortOuter);
  }

  const etag = response.headers.get("ETag");

  if (response.status === 304) {
    return { data: undefined as T, meta: undefined, etag, notModified: true };
  }

  if (response.status === 204) {
    return { data: undefined as T, meta: undefined, etag, notModified: false };
  }

  const text = await response.text();
  const payload: unknown = text.length > 0 ? safeParse(text) : null;

  if (!response.ok) {
    const error: ApiError =
      isApiError(payload)
        ? payload
        : { code: "unexpected_error", message: `Request failed (${response.status})` };
    throw new ApiRequestError(response.status, error);
  }

  const envelope = payload as { data: T; meta?: Record<string, unknown> };
  return { data: envelope?.data, meta: envelope?.meta, etag, notModified: false };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiError).code === "string" &&
    typeof (value as ApiError).message === "string"
  );
}

export const api = {
  signUp(input: SignupInput) {
    return request<AuthenticatedPayload>("/users", {
      method: "POST",
      body: { user: input },
      anonymous: true,
    });
  },

  signIn(email_address: string, password: string) {
    return request<AuthenticatedPayload>("/sessions", {
      method: "POST",
      body: { session: { email_address, password } },
      anonymous: true,
    });
  },

  signOut() {
    return request<void>("/sessions/current", { method: "DELETE" });
  },

  requestPasswordReset(email_address: string) {
    return request<unknown>("/password_resets", {
      method: "POST",
      body: { email_address },
      anonymous: true,
    });
  },

  /**
   * Catalog sync. Pass `updatedSince` for an incremental pull and `etag` to
   * turn a no-op sync into a single 304 (docs/SPEC.md §10).
   */
  listShops(params: {
    updatedSince?: Timestamp;
    bbox?: string;
    q?: string;
    etag?: string | null;
    signal?: AbortSignal;
  } = {}) {
    return request<CatalogPage>("/shops", {
      query: {
        updated_since: params.updatedSince,
        bbox: params.bbox,
        q: params.q,
      },
      headers: params.etag ? { "If-None-Match": params.etag } : {},
      anonymous: true,
      signal: params.signal,
      // A full catalog bootstrap over a slow connection needs the extra room.
      timeoutMs: 30_000,
    });
  },

  getShop(id: OpaqueId) {
    return request<ShopDetail>(`/shops/${id}`, { anonymous: true });
  },

  checkIn(input: CheckInInput, signal?: AbortSignal) {
    return request<CheckIn>("/check_ins", {
      method: "POST",
      body: { check_in: input },
      signal,
    });
  },

  listCheckIns(cursor?: OpaqueId) {
    return request<CheckIn[]>("/check_ins", { query: { cursor } });
  },

  getPassport() {
    return request<Passport>("/passport");
  },

  getProfile() {
    return request<User>("/profile");
  },

  listBadges() {
    return request<unknown>("/badges");
  },

  listContributions(cursor?: OpaqueId) {
    return request<Contribution[]>("/contributions", { query: { cursor } });
  },

  listLeaderboard(params: {
    scope?: LeaderboardScope;
    neighborhoodId?: OpaqueId;
    period?: LeaderboardPeriod;
    metric?: LeaderboardMetric;
  } = {}) {
    return request<unknown>("/leaderboards", {
      query: {
        scope: params.scope,
        neighborhood_id: params.neighborhoodId,
        period: params.period,
        metric: params.metric,
      },
      anonymous: true,
    });
  },

  submitShop(shop: Record<string, unknown>) {
    return request<Contribution>("/shops", { method: "POST", body: { shop } });
  },

  suggestEdit(shopId: OpaqueId, proposed_changes: Record<string, unknown>) {
    return request<Contribution>(`/shops/${shopId}/edits`, {
      method: "POST",
      body: { shop_edit: { proposed_changes } },
    });
  },

  report(input: {
    reportable_type: "shop" | "photo" | "check_in" | "user";
    reportable_id: OpaqueId;
    reason: string;
    note?: string;
  }) {
    return request<{ id: OpaqueId; status: "pending" }>("/reports", {
      method: "POST",
      body: { report: input },
    });
  },
};

export type { Shop, ShopDetail };
