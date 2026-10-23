/**
 * Types transcribed from docs/openapi.yml (Bunna Passport Mobile API v1.0.0),
 * ported from mobile/src/api/types.ts.
 *
 * These are hand-written rather than generated so the client stays readable,
 * but the contract file is authoritative: when the two disagree, openapi.yml
 * wins and this file is wrong.
 */

import type { StampLevel } from "@/design/seal/levels";

export type OpaqueId = number;
export type Timestamp = string;

export type TrustLevel = "newcomer" | "regular" | "curator" | "moderator";
export type PriceBand = "budget" | "standard" | "premium" | "splurge";
export type ShopStatus = "live" | "closed" | "merged";
export type TombstoneStatus = "hidden" | "closed" | "merged";
export type HoursFreshness = "fresh" | "stale" | "unknown";

export type User = {
  id: OpaqueId;
  handle: string;
  display_name: string;
  trust_level: TrustLevel;
  verified_check_ins_count: number;
  stamps_count: number;
  home_neighborhood_id: OpaqueId | null;
  avatar_seed: string | null;
  /** Server-computed against the 04:00 Addis coffee day. */
  had_cup_today: boolean;
  shares_cup_status: boolean;
  /** Whether friends see this person's verified visits in their feed. */
  shares_visits: boolean;
  /** Whether the bot sends the afternoon "had a cup?" nudge. */
  daily_nudges: boolean;
  joined_at: Timestamp;
};

export type Neighborhood = {
  id: OpaqueId;
  name: string;
  name_am: string;
};

export type ShopAttributes = {
  wifi?: boolean;
  outdoor_seating?: boolean;
  jebena_service?: boolean;
  espresso_bar?: boolean;
  takeaway?: boolean;
  parking?: boolean;
};

export type OpeningInterval = { opens: string; closes: string };
export type WeeklyHours = Partial<Record<Weekday, OpeningInterval[]>>;

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Shop = {
  id: OpaqueId;
  name: string;
  name_am: string;
  slug: string;
  neighborhood: Neighborhood;
  landmark: string;
  latitude: number;
  longitude: number;
  status: ShopStatus;
  price_band: PriceBand | null;
  attributes: ShopAttributes;
  hours?: ShopHours;
  updated_at: Timestamp;
};

export type ShopHours = {
  schedule: WeeklyHours;
  freshness: HoursFreshness;
  confirmed_at: Timestamp | null;
};

export type Photo = {
  id: OpaqueId;
  caption: string | null;
  urls: { thumb: string; medium: string; full: string };
};

export type ShopDetail = Shop & {
  check_ins_count: number;
  stamps_count: number;
  /** The signed-in viewer's own standing here, null for a stranger. */
  stamp: {
    level: StampLevel;
    earned_at: Timestamp;
    check_ins_count: number;
    visits_to_next_level: number | null;
  } | null;
  merged_into_id: OpaqueId | null;
  hours: ShopHours;
  photos: Photo[];
};

export type ShopTombstone = {
  id: OpaqueId;
  status: TombstoneStatus;
  merged_into_id: OpaqueId | null;
  updated_at: Timestamp;
};

export type CatalogPage = {
  shops: Shop[];
  tombstones: ShopTombstone[];
};

export type SignupInput = {
  email_address: string;
  handle: string;
  display_name: string;
  password: string;
  password_confirmation: string;
  home_neighborhood_id?: OpaqueId;
};

export type AuthenticatedPayload = {
  user: User;
  token: string;
  expires_at: Timestamp;
};

export type CheckInInput = {
  shop_id: OpaqueId;
  idempotency_key: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  mock_location?: boolean;
  drink?: string;
  rating?: number;
  note?: string;
};

/**
 * The server deliberately never discloses `flagged` — a flagged check-in
 * reports as `accepted` (see docs/SPEC.md §8). The client must not try to
 * infer or display flag state.
 */
export type CheckInStatus = "accepted" | "rejected";

export type RejectionCode = "weak_gps" | "too_far" | "cooldown" | "daily_limit";

export type CheckIn = {
  id: OpaqueId;
  shop: { id: OpaqueId; name: string; name_am: string };
  status: CheckInStatus;
  rejection_code: RejectionCode | null;
  distance_meters: number;
  drink: string | null;
  rating: number | null;
  note: string | null;
  occurred_at: Timestamp;
  /** True when this visit created the user's first stamp at this shop. */
  stamp_earned: boolean;
  stamp_level: StampLevel | null;
};

/** The rendered share cards for one stamp (POST …/share_cards). */
export type ShareCards = {
  check_in_id: OpaqueId;
  doodle: boolean;
  /** 1080 × 1350, for chats and feeds. */
  post_url: string;
  /** 1080 × 1920, for Telegram, Instagram and TikTok stories. */
  story_url: string;
  /** The sender's invite link; also the button on the prepared message. */
  invite_url: string;
  /** For Telegram's shareMessage; null outside Telegram accounts. */
  prepared_message_id: string | null;
};

export type Review = {
  id: OpaqueId;
  user: { id: OpaqueId; handle: string; display_name: string };
  rating: number | null;
  note: string | null;
  drink: string | null;
  occurred_at: Timestamp;
};

export type ReviewSummary = {
  rating_average: number | null;
  rating_count: number;
  total: number;
};

export type PassportStamp = {
  id: OpaqueId;
  shop: { id: OpaqueId; name: string; name_am: string };
  earned_at: Timestamp;
  level: StampLevel;
  check_ins_count: number;
  visits_to_next_level: number | null;
};

export type Passport = {
  stamps: PassportStamp[];
  stamped_count: number;
  total_shops: number;
  completion_percentage: number;
  had_cup_today: boolean;
};

export type ContributionType =
  | "Shop::Submission"
  | "Shop::Edit"
  | "Shop::PhotoSubmission";

export type Contribution = {
  id: OpaqueId;
  type: ContributionType;
  status: "pending" | "approved" | "rejected" | "auto_approved";
  confirmation_count: number;
  reviewed_at: Timestamp | null;
  rejection_reason: string | null;
  created_at: Timestamp;
};

export type LeaderboardScope = "city" | "neighborhood" | "friends";
export type LeaderboardPeriod = "week" | "month" | "all_time";
export type LeaderboardMetric = "cups" | "shops";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type DataEnvelope<T, M = undefined> = M extends undefined
  ? { data: T }
  : { data: T; meta: M };

export type LeaderboardEntry = {
  rank: number;
  value: number;
  user: {
    id: OpaqueId;
    handle: string;
    display_name: string;
    avatar_seed: string | null;
    /** null when that person has turned off sharing their coffee status. */
    had_cup_today: boolean | null;
  };
};

/** A café as the stats name it: just enough to open it. */
export type StatsShop = { id: OpaqueId; name: string; name_am: string };

export type StatsShopCount = { shop: StatsShop; cups: number };

export type StatsDrink = { name: string; cups: number };

export type MonthCount = { month: string; cups: number };

/** GET /stats/me. Verified cups only; times bucketed in Addis local time. */
export type PersonalStats = {
  totals: {
    cups: number;
    cafes: number;
    areas: number;
    reviews: number;
    contributions: number;
    badges: number;
    catalog_cafes: number;
    catalog_areas: number;
    catalog_badges: number;
  };
  first_cup_at: Timestamp | null;
  last_cup_at: Timestamp | null;
  city_rank: { rank: number; drinkers: number } | null;
  streaks: { current_weeks: number; longest_weeks: number; coffee_days: number; best_day_cups: number };
  favorite_cafe: { shop: StatsShop; cups: number; level: StampLevel } | null;
  stamp_levels: Record<StampLevel, number>;
  /** 24 entries, local hour 0–23. */
  by_hour: number[];
  /** 7 entries, Monday first. */
  by_weekday: number[];
  by_month: MonthCount[];
  top_areas: (Neighborhood & { cups: number })[];
  favorite_drink: StatsDrink | null;
  average_rating: number | null;
};

/** GET /stats/city. Public, cached for up to ten minutes. */
export type CityStats = {
  totals: {
    cafes: number;
    areas: number;
    cups: number;
    cups_this_week: number;
    drinkers: number;
    drinkers_this_week: number;
    stamps: number;
    reviews: number;
    contributions: number;
    unstamped_cafes: number;
    jebena_cafes: number;
    cafes_with_hours: number;
    new_cafes: number;
  };
  by_hour: number[];
  by_weekday: number[];
  by_month: MonthCount[];
  top_cafes: StatsShopCount[];
  rising_cafes: StatsShopCount[];
  top_rated: { shop: StatsShop; average: number; ratings: number }[];
  areas: (Neighborhood & { cafes: number; cups: number; cups_this_week: number })[];
  top_drinks: StatsDrink[];
  price_bands: Record<"budget" | "standard" | "premium" | "splurge", number>;
  generated_at: Timestamp;
};

/** Someone the viewer is friends with: a doodle and a handle, nothing more. */
export type Friend = {
  id: OpaqueId;
  handle: string;
  display_name: string;
  avatar_seed: string | null;
  /** null when they've turned off sharing it. */
  had_cup_today: boolean | null;
  stamps_count: number;
  verified_check_ins_count: number;
};

/** GET /invite. */
export type Invite = { token: string; url: string; friends_count: number };

/** GET /invites/{token}: who sent the link that was just opened. */
export type InvitePreview = { inviter: Friend; own: boolean; already_friends: boolean };

/**
 * A friend's verified visit. It names the coffee day, never the time, so the
 * feed can't say where someone is right now.
 */
export type FeedItem = {
  id: OpaqueId;
  user: Friend;
  shop: { id: OpaqueId; name: string; name_am: string; neighborhood: Neighborhood };
  /** YYYY-MM-DD, the Addis coffee day (starting 04:00). */
  coffee_day: string;
  stamp_earned: boolean;
  stamp_level: StampLevel | null;
  drink: string | null;
  rating: number | null;
  note: string | null;
};
