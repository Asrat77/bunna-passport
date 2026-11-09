import type { AvatarTraits } from "@/design/doodle/traits";
import type { Language } from "@/i18n/strings";
import { ApiRequestError, NetworkError } from "./errors";
import type {
  ApiError,
  AuthenticatedPayload,
  CatalogPage,
  BadgeProgress,
  CheckIn,
  CheckInResult,
  CheckInInput,
  CityStats,
  Contribution,
  FeedItem,
  ReactionKind,
  Reactions,
  ReceivedReaction,
  Friend,
  Invite,
  InviteMessage,
  InvitePreview,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardScope,
  OpaqueId,
  Passport,
  PersonalStats,
  Review,
  ReviewFilter,
  Saying,
  ShareCards,
  Shop,
  ShopDetail,
  SignupInput,
  Timestamp,
  User,
} from "./types";

/**
 * Ported from mobile/src/api/client.ts. Only the base URL and the photo
 * upload differ: the web has no Metro host to derive the API from, and a
 * picked photo is a File rather than a URI.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

/** A stamp to share: by the visit that earned it, or by its shop. */
export type ShareTarget = { checkInId: OpaqueId } | { shopId: OpaqueId };

/**
 * Where the Rails API lives. Same origin by default: the dev server proxies
 * /api to Rails, so one HTTPS tunnel serves Telegram both.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

type TokenSource = () => string | null;

let readToken: TokenSource = () => null;

/** Wired once at startup by the auth provider. */
export function setTokenSource(source: TokenSource): void {
  readToken = source;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
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
  const multipart = body instanceof FormData;
  // Let fetch set multipart/form-data itself — naming it here drops the
  // boundary and the server sees an unparseable body.
  if (body !== undefined && !multipart) requestHeaders["Content-Type"] = "application/json";

  const token = anonymous ? null : readToken();
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : multipart ? (body as FormData) : JSON.stringify(body),
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

  /**
   * Exchanges Telegram's signed initData for the same bearer token email
   * sign-in returns. The server checks the HMAC; the client never trusts
   * initDataUnsafe for identity.
   */
  telegramSignIn(init_data: string) {
    return request<AuthenticatedPayload>("/telegram_sessions", {
      method: "POST",
      body: { init_data },
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

  /** A photo, when there is one, makes this a multipart request. */
  checkIn(input: CheckInInput, photo?: File | null, signal?: AbortSignal) {
    if (!photo) {
      return request<CheckInResult>("/check_ins", { method: "POST", body: { check_in: input }, signal });
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(input)) {
      if (Array.isArray(value)) for (const item of value) form.append(`check_in[${key}][]`, String(item));
      else if (value !== undefined) form.append(`check_in[${key}]`, String(value));
    }
    form.append("check_in[photo]", photo);
    return request<CheckInResult>("/check_ins", { method: "POST", body: form, signal, timeoutMs: 60_000 });
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

  updateProfile(profile: {
    avatar_seed?: string | null;
    avatar_traits?: AvatarTraits | null;
    shares_cup_status?: boolean;
    shares_visits?: boolean;
    daily_nudges?: boolean;
    friend_updates?: boolean;
    language?: Language;
  }) {
    return request<User>("/profile", { method: "PATCH", body: { profile } });
  },

  listBadges() {
    return request<BadgeProgress[]>("/badges");
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
    return request<LeaderboardEntry[]>("/leaderboards", {
      query: {
        scope: params.scope,
        neighborhood_id: params.neighborhoodId,
        period: params.period,
        metric: params.metric,
      },
      // The friends board is yours, so it needs to know who you are.
      anonymous: params.scope !== "friends",
    });
  },

  listFriends() {
    return request<Friend[]>("/friends");
  },

  /** Accepting a link befriends both people at once. */
  acceptInvite(invite_token: string) {
    return request<Friend>("/friends", { method: "POST", body: { invite_token } });
  },

  removeFriend(id: OpaqueId) {
    return request<void>(`/friends/${id}`, { method: "DELETE" });
  },

  getInvite() {
    return request<Invite>("/invite");
  },

  /** Retires the current link for a new one; friends stay friends. */
  /** The invite as a prepared Telegram message with an open button, when the sender is on Telegram. */
  prepareInviteMessage(text: string, button: string) {
    return request<InviteMessage>("/invite/message", { method: "POST", body: { text, button } });
  },

  rotateInvite() {
    return request<Invite>("/invite", { method: "DELETE" });
  },

  previewInvite(token: string) {
    return request<InvitePreview>(`/invites/${encodeURIComponent(token)}`);
  },

  getFeed(cursor?: OpaqueId) {
    return request<FeedItem[]>("/feed", { query: { cursor } });
  },

  /** Sets or (with null) takes back your reaction to a friend's visit. */
  reactToFeedItem(checkInId: OpaqueId, kind: ReactionKind | null) {
    const path = `/feed/${checkInId}/reaction`;
    return kind ? request<Reactions>(path, { method: "PUT", body: { kind } }) : request<Reactions>(path, { method: "DELETE" });
  },

  listReceivedReactions() {
    return request<ReceivedReaction[]>("/reactions");
  },

  getPersonalStats() {
    return request<PersonalStats>("/stats/me");
  },

  getCityStats() {
    return request<CityStats>("/stats/city", { anonymous: true });
  },

  /**
   * A photo of the café, when there is one, makes this multipart: the rest
   * of the form goes along as Rails-style bracketed fields.
   */
  submitShop(shop: Record<string, unknown>, photo?: File | null) {
    if (!photo) return request<Contribution>("/shops", { method: "POST", body: { shop } });

    const form = new FormData();
    appendFields(form, "shop", shop);
    form.append("shop[photo]", photo);
    return request<Contribution>("/shops", { method: "POST", body: form, timeoutMs: 60_000 });
  },

  /**
   * Uploads a shop photo as multipart. Photos are large and connections here
   * are not, so this gets its own generous timeout rather than the default.
   */
  submitPhoto(shopId: OpaqueId, file: File, caption?: string) {
    const form = new FormData();
    form.append("shop_photo[image]", file);
    if (caption) form.append("shop_photo[caption]", caption);

    return request<Contribution>(`/shops/${shopId}/photos`, {
      method: "POST",
      body: form,
      timeoutMs: 60_000,
    });
  },

  /**
   * Fills in or changes what someone said about a visit already recorded.
   * Allowed for a week afterwards; cannot revise where or when it happened.
   */
  updateCheckIn(id: OpaqueId, saying: Saying) {
    return request<CheckIn>(`/check_ins/${id}`, {
      method: "PATCH",
      body: { check_in: saying },
    });
  },

  /**
   * Renders, or reuses, the share cards for a stamp: by the visit that earned
   * it, or by its shop. `caption` goes on the Telegram message.
   */
  createShareCards(target: ShareTarget, options: { doodle: boolean; caption?: string }) {
    const path = "checkInId" in target ? `/check_ins/${target.checkInId}/share_cards` : `/shops/${target.shopId}/share_cards`;
    return request<ShareCards>(path, {
      method: "POST",
      body: options,
      // Drawing the cards the first time takes a few seconds.
      timeoutMs: 30_000,
    });
  },

  /** What people said on visits the server verified, newest first, a page at a time. */
  listReviews(shopId: OpaqueId, options: { cursor?: OpaqueId; filter?: ReviewFilter } = {}) {
    return request<Review[]>(`/shops/${shopId}/reviews`, { query: { cursor: options.cursor, filter: options.filter } });
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

  /** A crash on this phone, for the operators' Telegram alerts. */
  reportClientError(client_error: { message: string; stack?: string; screen?: string }) {
    return request<void>("/client_errors", {
      method: "POST",
      body: { client_error },
      timeoutMs: 5_000,
    });
  },
};

export type { Shop, ShopDetail };

/**
 * Flattens nested values into FormData the way Rails reads them back:
 * `shop[hours][monday][][opens]`. Arrays of objects rely on each object's
 * keys arriving together, which this keeps.
 */
export function appendFields(form: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) appendFields(form, `${key}[]`, item);
  } else if (typeof value === "object" && !(value instanceof Blob)) {
    for (const [name, inner] of Object.entries(value as Record<string, unknown>)) appendFields(form, `${key}[${name}]`, inner);
  } else {
    form.append(key, value instanceof Blob ? value : String(value));
  }
}
