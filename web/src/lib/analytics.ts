import type { PostHog } from "posthog-js";
import type { User } from "@/api/types";

/**
 * Product analytics through PostHog. Off unless VITE_POSTHOG_KEY is set, and
 * then posthog-js loads in its own chunk, so a build without a key ships none
 * of it. Events are named explicitly here rather than autocaptured, and never
 * carry coordinates, notes, emails or Telegram names.
 */
const KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY || undefined;
const HOST: string = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

export type AnalyticsEvent =
  | "app_opened"
  | "signed_in"
  | "screen_viewed"
  | "location_granted"
  | "location_failed"
  | "check_in_submitted"
  | "check_in_succeeded"
  | "check_in_rejected"
  | "check_in_failed"
  | "stamp_earned"
  | "share_card_shared"
  | "invite_accepted";

type Properties = Record<string, string | number | boolean | null | undefined>;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
// Calls made before posthog-js arrives, replayed once it has.
const queue: Array<(posthog: PostHog) => void> = [];

export const analyticsEnabled = (): boolean => Boolean(KEY);

export function initAnalytics(context: Properties = {}): void {
  if (!KEY || loading) return;
  loading = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        person_profiles: "identified_only",
        // The app is one URL with an in-memory screen stack, so screens are
        // reported as screen_viewed instead of pageviews.
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        disable_session_recording: true,
        // Telegram's webview may drop cookies between launches.
        persistence: "localStorage+cookie",
      });
      posthog.register({ app: "miniapp", ...context });
      client = posthog;
      for (const call of queue.splice(0)) call(posthog);
      return posthog;
    })
    .catch(() => null);
}

function withClient(call: (posthog: PostHog) => void): void {
  if (!KEY) return;
  if (client) call(client);
  else if (queue.length < 100) queue.push(call);
}

export function track(event: AnalyticsEvent, properties?: Properties): void {
  withClient((posthog) => posthog.capture(event, properties));
}

/** Ties events to the Bunna user id; no name, handle or email leaves the app. */
export function identifyUser(user: User): void {
  withClient((posthog) =>
    posthog.identify(String(user.id), {
      trust_level: user.trust_level,
      stamps_count: user.stamps_count,
      verified_check_ins_count: user.verified_check_ins_count,
      has_home_neighborhood: user.home_neighborhood_id !== null,
    }),
  );
}

export function resetAnalytics(): void {
  withClient((posthog) => posthog.reset());
}
