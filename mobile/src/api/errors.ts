import type { ApiError, RejectionCode } from "./types";

/** A structured `{ code, message, details }` error body from the API. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** A 409 from POST /shops carries the near-duplicate candidates. */
  get isDuplicateCandidates(): boolean {
    return this.status === 409 && this.code === "duplicate_candidates";
  }

  /**
   * Check-in rejections arrive as 422 with the rule that failed as the code.
   * Anything else at 422 is a validation failure, not a rejected visit.
   */
  get rejectionCode(): RejectionCode | null {
    const codes: RejectionCode[] = ["weak_gps", "too_far", "cooldown", "daily_limit"];
    return codes.includes(this.code as RejectionCode)
      ? (this.code as RejectionCode)
      : null;
  }
}

/** The request never reached the server, or timed out on the way back. */
export class NetworkError extends Error {
  readonly cause?: unknown;

  constructor(message = "Network request failed", cause?: unknown) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiRequestError) {
    return error.status >= 500 || error.isRateLimited;
  }
  return false;
}
