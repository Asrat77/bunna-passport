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

export type LeaderboardScope = "city" | "neighborhood";
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
