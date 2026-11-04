import { ApiRequestError, NetworkError } from "./errors";
/**
 * Ported from mobile/src/api/client.ts. Only the base URL and the photo
 * upload differ: the web has no Metro host to derive the API from, and a
 * picked photo is a File rather than a URI.
 */
const DEFAULT_TIMEOUT_MS = 15_000;
/**
 * Where the Rails API lives. Same origin by default: the dev server proxies
 * /api to Rails, so one HTTPS tunnel serves Telegram both.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
let readToken = () => null;
/** Wired once at startup by the auth provider. */
export function setTokenSource(source) {
    readToken = source;
}
function buildUrl(path, query) {
    const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== "")
                url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}
async function request(path, options = {}) {
    const { method = "GET", body, query, headers = {}, anonymous = false, timeoutMs = DEFAULT_TIMEOUT_MS, signal, } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    // Propagate an outer cancellation (e.g. the user backing out of check-in).
    const abortOuter = () => controller.abort();
    signal?.addEventListener("abort", abortOuter);
    const requestHeaders = {
        Accept: "application/json",
        ...headers,
    };
    const multipart = body instanceof FormData;
    // Let fetch set multipart/form-data itself — naming it here drops the
    // boundary and the server sees an unparseable body.
    if (body !== undefined && !multipart)
        requestHeaders["Content-Type"] = "application/json";
    const token = anonymous ? null : readToken();
    if (token)
        requestHeaders.Authorization = `Bearer ${token}`;
    let response;
    try {
        response = await fetch(buildUrl(path, query), {
            method,
            headers: requestHeaders,
            body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
            signal: controller.signal,
        });
    }
    catch (cause) {
        throw new NetworkError(controller.signal.aborted ? "Request timed out" : "Network request failed", cause);
    }
    finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abortOuter);
    }
    const etag = response.headers.get("ETag");
    if (response.status === 304) {
        return { data: undefined, meta: undefined, etag, notModified: true };
    }
    if (response.status === 204) {
        return { data: undefined, meta: undefined, etag, notModified: false };
    }
    const text = await response.text();
    const payload = text.length > 0 ? safeParse(text) : null;
    if (!response.ok) {
        const error = isApiError(payload)
            ? payload
            : { code: "unexpected_error", message: `Request failed (${response.status})` };
        throw new ApiRequestError(response.status, error);
    }
    const envelope = payload;
    return { data: envelope?.data, meta: envelope?.meta, etag, notModified: false };
}
function safeParse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
function isApiError(value) {
    return (typeof value === "object" &&
        value !== null &&
        typeof value.code === "string" &&
        typeof value.message === "string");
}
export const api = {
    signUp(input) {
        return request("/users", {
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
    telegramSignIn(init_data) {
        return request("/telegram_sessions", {
            method: "POST",
            body: { init_data },
            anonymous: true,
        });
    },
    signIn(email_address, password) {
        return request("/sessions", {
            method: "POST",
            body: { session: { email_address, password } },
            anonymous: true,
        });
    },
    signOut() {
        return request("/sessions/current", { method: "DELETE" });
    },
    requestPasswordReset(email_address) {
        return request("/password_resets", {
            method: "POST",
            body: { email_address },
            anonymous: true,
        });
    },
    /**
     * Catalog sync. Pass `updatedSince` for an incremental pull and `etag` to
     * turn a no-op sync into a single 304 (docs/SPEC.md §10).
     */
    listShops(params = {}) {
        return request("/shops", {
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
    getShop(id) {
        return request(`/shops/${id}`, { anonymous: true });
    },
    /** A photo, when there is one, makes this a multipart request. */
    checkIn(input, photo, signal) {
        if (!photo) {
            return request("/check_ins", { method: "POST", body: { check_in: input }, signal });
        }
        const form = new FormData();
        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined)
                form.append(`check_in[${key}]`, String(value));
        }
        form.append("check_in[photo]", photo);
        return request("/check_ins", { method: "POST", body: form, signal, timeoutMs: 60_000 });
    },
    listCheckIns(cursor) {
        return request("/check_ins", { query: { cursor } });
    },
    getPassport() {
        return request("/passport");
    },
    getProfile() {
        return request("/profile");
    },
    updateProfile(profile) {
        return request("/profile", { method: "PATCH", body: { profile } });
    },
    listBadges() {
        return request("/badges");
    },
    listContributions(cursor) {
        return request("/contributions", { query: { cursor } });
    },
    listLeaderboard(params = {}) {
        return request("/leaderboards", {
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
        return request("/friends");
    },
    /** Accepting a link befriends both people at once. */
    acceptInvite(invite_token) {
        return request("/friends", { method: "POST", body: { invite_token } });
    },
    removeFriend(id) {
        return request(`/friends/${id}`, { method: "DELETE" });
    },
    getInvite() {
        return request("/invite");
    },
    /** Retires the current link for a new one; friends stay friends. */
    rotateInvite() {
        return request("/invite", { method: "DELETE" });
    },
    previewInvite(token) {
        return request(`/invites/${encodeURIComponent(token)}`);
    },
    getFeed(cursor) {
        return request("/feed", { query: { cursor } });
    },
    getPersonalStats() {
        return request("/stats/me");
    },
    getCityStats() {
        return request("/stats/city", { anonymous: true });
    },
    submitShop(shop) {
        return request("/shops", { method: "POST", body: { shop } });
    },
    /**
     * Uploads a shop photo as multipart. Photos are large and connections here
     * are not, so this gets its own generous timeout rather than the default.
     */
    submitPhoto(shopId, file, caption) {
        const form = new FormData();
        form.append("shop_photo[image]", file);
        if (caption)
            form.append("shop_photo[caption]", caption);
        return request(`/shops/${shopId}/photos`, {
            method: "POST",
            body: form,
            timeoutMs: 60_000,
        });
    },
    /**
     * Fills in what someone chose to say about a visit already recorded. Allowed
     * for a day afterwards; cannot revise where or when the visit happened.
     */
    updateCheckIn(id, saying) {
        return request(`/check_ins/${id}`, {
            method: "PATCH",
            body: { check_in: saying },
        });
    },
    /**
     * Renders, or reuses, the share cards for a stamp: by the visit that earned
     * it, or by its shop. `caption` goes on the Telegram message.
     */
    createShareCards(target, options) {
        const path = "checkInId" in target ? `/check_ins/${target.checkInId}/share_cards` : `/shops/${target.shopId}/share_cards`;
        return request(path, {
            method: "POST",
            body: options,
            // Drawing the cards the first time takes a few seconds.
            timeoutMs: 30_000,
        });
    },
    /** What people said on visits the server verified. */
    listReviews(shopId) {
        return request(`/shops/${shopId}/reviews`);
    },
    suggestEdit(shopId, proposed_changes) {
        return request(`/shops/${shopId}/edits`, {
            method: "POST",
            body: { shop_edit: { proposed_changes } },
        });
    },
    report(input) {
        return request("/reports", {
            method: "POST",
            body: { report: input },
        });
    },
    /** A crash on this phone, for the operators' Telegram alerts. */
    reportClientError(client_error) {
        return request("/client_errors", {
            method: "POST",
            body: { client_error },
            timeoutMs: 5_000,
        });
    },
};
