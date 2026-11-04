/** A structured `{ code, message, details }` error body from the API. */
export class ApiRequestError extends Error {
    status;
    code;
    details;
    constructor(status, body) {
        super(body.message);
        this.name = "ApiRequestError";
        this.status = status;
        this.code = body.code;
        this.details = body.details;
    }
    get isUnauthorized() {
        return this.status === 401;
    }
    get isRateLimited() {
        return this.status === 429;
    }
    /** A 409 from POST /shops carries the near-duplicate candidates. */
    get isDuplicateCandidates() {
        return this.status === 409 && this.code === "duplicate_candidates";
    }
    /**
     * Check-in rejections arrive as 422 with the rule that failed as the code.
     * Anything else at 422 is a validation failure, not a rejected visit.
     */
    get rejectionCode() {
        const codes = ["weak_gps", "too_far", "cooldown", "daily_limit"];
        return codes.includes(this.code)
            ? this.code
            : null;
    }
}
/** The request never reached the server, or timed out on the way back. */
export class NetworkError extends Error {
    cause;
    constructor(message = "Network request failed", cause) {
        super(message);
        this.name = "NetworkError";
        this.cause = cause;
    }
}
export function isRetryable(error) {
    if (error instanceof NetworkError)
        return true;
    if (error instanceof ApiRequestError) {
        return error.status >= 500 || error.isRateLimited;
    }
    return false;
}
