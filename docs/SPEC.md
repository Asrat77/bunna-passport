# Bunna Passport — Product & Technical Spec

**Status:** Phase 0 complete. This document is the source of truth. Nothing gets built that isn't in here or added to here.
**Last updated:** 2026-07-29

---

## 1. What this is

Bunna Passport is a digital coffee passport for Addis Ababa. You visit a coffee shop, check in, and earn a stamp. Your passport fills up. Your cup count climbs. The map fills in.

The map is built by the people using it. There is no coffee-shop database for Addis worth licensing, so users create and correct the shop data themselves, and the passport mechanic is what makes that worth doing.

**One line:** *The coffee map of Ethiopia, built by the people drinking it.*

### The wedge

Community-sourced venue data is normally a liability — cold start, spam, duplicates, moderation cost. Untappd sidestepped it entirely by reading venue data from Foursquare. BrewMap uses MapKit and Google Places.

It stops being a liability in exactly one condition: **a market where the commercial POI databases are bad.** That is Addis Ababa. Ethiopia largely lacks street addressing, Google Places coverage of Addis cafés is thin and stale, and no competitor is present. Addis went from ~440 to ~540 specialty cafés between 2022 and 2023 and nobody is mapping it.

So the dataset is the product. The passport is what we pay contributors in.

In London or Seattle this logic inverts: community data is strictly worse than Google Places, and BrewMap already wins. **We do not launch outside Ethiopia until the Addis dataset is unambiguously the best one that exists.**

---

## 2. Phase 0 research summary

Recorded so future-us knows why these decisions were made.

### Three business models exist in this space

**A. Curated paper passport + merchant deals.** Beer Passport UK (75 London taprooms), Craft Beer Passport Australia (400+ venues, 8 state books), Dallas / Raleigh / Omaha Coffee Passports, Lekker Passport South Africa. Sell the book for ~$25–30, each shop gives one free drink, the passport expires annually. Venue counts are small and curated — 18 to 100. Revenue on day one, no engineering required. This is a media and deals business.

**B. Global social check-in network.** Untappd — 8–9M users, ~1B check-ins, badges that level every 5 check-ins up to level 100. Monetizes B2B through Untappd For Business. **It does not own its venue data.** If a venue isn't in Foursquare, it isn't in Untappd.

**C. Vertical coffee app.** BrewMap — iOS public beta, 5 cities, markets itself as "your coffee passport." Stamps per visit, 20+ badges Common→Legendary, XP, streaks, seasonal challenges, friend activity feed, flavour-wheel tasting notes, plus a 14-course "Coffee Academy," daily trivia, and ambient café sounds. Data from MapKit and Google Places.

### What we take from each

- From A: the **trail** concept (a curated, finite, completable set of shops) and the knowledge that shop-facing deals are a real revenue path when we want one.
- From B: the badge and leaderboard mechanics, and the warning that owning venue data is genuinely hard — we are choosing the hard path deliberately, in the one market where it pays.
- From C: what **not** to build. BrewMap's Coffee Academy, trivia, and ambient sounds are surface area that doesn't defend anything. We compete on data quality in one city, not on feature count globally.

### Naming

`bunna passport` is taken as an Instagram handle by an unrelated coffee account. Two adjacent names are already consumer apps aimed at the same audience:

- **Jebena** — Ethiopian/Eritrean dating app, live since 2020, ~650 App Store ratings.
- **Abol** — Habesha dating and community app, and it already uses the **Abol → Tona → Bereka** ceremony progression as its core mechanic.

Codex had silently named the codebase `JebenaPassport`, which is a direct collision with a known app in the same cultural niche. That naming is discarded.

**Decision: the product is Bunna Passport.** Chosen deliberately with the conflicts known.

Consequences to manage rather than avoid:
- Secure a distinct social handle (`@bunnapassport` is unavailable; pick and lock a variant across all platforms at once before any public post).
- Register a primary domain. `bunnapassport.com` was free at time of writing — **register it now, it is the cheapest action in this document.**
- App Store discovery will be noisy against the word "bunna." The listing subtitle must carry the differentiator, e.g. *"Addis coffee map & passport."*
- Do not use Abol/Tona/Bereka as the level or tier names. That progression is taken by an app in our exact niche. Level naming is an open item — see §14.

---

## 3. Who this is for

**Primary — the Addis coffee explorer.** 20s–30s, lives in Addis, already spends real money in cafés, already photographs them. Motivated by completion, discovery, and mild status among friends. Has an Android phone more often than an iPhone. Data is expensive to them; they notice an app that burns it.

**Secondary — the contributor.** A subset of the above who will add and correct shops for the standing and the badge. Small — expect 2–5% of users to produce most of the data. The entire moderation design assumes this ratio.

**Tertiary, not yet a user — the shop owner.** Not in v1. The domain model must not make it painful to add them later, because this is the most likely revenue path.

**Explicitly not v1:** tourists, the diaspora, and other cities. They arrive after the Addis dataset is good.

---

## 4. The core loop

```
open app  →  see coffee shops near you on a map
          →  walk into one
          →  check in (GPS verified)
          →  first visit here? earn a stamp. every visit? +1 cup.
          →  passport fills, cup count rises, leaderboard moves
          →  shop missing or wrong? fix it → contributor standing rises
```

Two counters, deliberately distinct — this is the central modelling decision:

| | **Stamp** | **Check-in** |
|---|---|---|
| Meaning | You have been to this shop | One visit |
| Cardinality | One per user per shop, ever | Many per user per shop |
| Powers | The passport pages, completion %, trails | Cup count, leaderboards, streaks |

Stamps measure **breadth** (how much of Addis you've seen). Check-ins measure **volume** (how much coffee you drink). Both of the user-facing goals map cleanly onto one of them, and neither can be gamed into the other.

---

## 5. Scope

### v1 — must exist for the product to make sense

- Browse coffee shops: map view and list view, sorted by distance
- Shop detail: name (Amharic + Latin), neighborhood, landmark directions, photos, hours, what they serve, price band
- Check in at a shop, GPS-verified, with optional drink + rating + photo
- Passport: the shops you've stamped, and the ones you haven't
- Cup count and personal stats
- Leaderboards: city, neighborhood, friends; weekly / monthly / all-time
- Submit a new shop
- Suggest an edit to an existing shop
- Report a bad shop, photo, or duplicate
- Moderation queue and contributor trust levels
- Badges

### v2 — designed for, not built

- Social graph: follow people, activity feed
- Trails (curated shop sets: "Piassa Old Guard", "Bole Specialty")
- Shop owner accounts and a shop dashboard
- Offers and rewards
- A second city

### Explicitly not doing

- Coffee education courses, trivia, ambient sounds, flavour-wheel tasting notes — BrewMap's surface area, defends nothing
- Written reviews in v1 (a 1–5 rating and the drink logged is enough; free text means a moderation burden we can't staff yet)
- Ordering, payments, delivery
- Anything outside Ethiopia

---

## 6. Addis-specific constraints

These are load-bearing. A generic coffee app fails on every one of them.

**There are no usable street addresses.** Navigation is by landmark: *"behind Edna Mall," "off Bole Medhanialem, second gate."* The shop model carries a `landmark` free-text field and a **neighborhood**, not `street_address`. Neighborhood is a first-class, enumerable dimension — Bole, Kazanchis, Piassa, Sarbet, CMC, Megenagna, Summit, Gerji, Old Airport, 4 Kilo, 6 Kilo, Mexico, Lideta — and it drives leaderboards, trails, and filtering.

**Bilingual, both directions.** Shop names exist in Amharic and Latin script, often both (ቶሞካ / Tomoca) and often transliterated inconsistently (Tomoca / Tomoka / To.Mo.Ca). Every shop carries `name` and `name_am`. Search must match across scripts and across loose transliteration, and duplicate detection must too, or the database fills with the same shop spelled four ways.

**Mobile data is expensive and patchy.** The API must be lean and incrementally syncable — the client should be able to pull the entire Addis shop list once and then request only what changed. Images are served in multiple sizes and the client picks a small one on metered connections. Check-in submission must be **idempotent** (client-generated key) so that a retry over a bad connection never produces a double stamp.

**Money is ETB.** Price bands in birr, not dollars, not "$$".

**Phone-first identity, but SMS is a real problem.** Ethio Telecom is a monopoly and international SMS gateways to Ethiopia are unreliable and expensive. Email/password is the baseline that always works and is what Phase 1 ships. Phone or Telegram login is a Phase 2 decision (Telegram has unusually high penetration in Ethiopia and is worth a serious look). The `User` model must not assume email is the only credential.

---

## 7. Domain model

Rails 8. Rich models, thin controllers, no service-object layer. Behaviour lives on the objects it belongs to. Namespaced nested classes for lifecycle events rather than a pile of top-level models.

### Core

**`User`** — `handle` (unique, public), `display_name`, `email_address`, `password_digest`, `avatar` (Active Storage), `home_neighborhood`, `trust_level`, `verified_check_ins_count`, `stamps_count`. Counter caches, because the profile and leaderboard read them constantly.

**`Session`** — per Rails 8's auth generator. Token-bearing, revocable, one row per device.

**`Shop`** — the venue and the thing we actually own.
- `name`, `name_am`, `slug`
- `neighborhood` (belongs_to), `landmark` (text), `latitude`, `longitude`
- `hours` (JSON, per-weekday open/close)
- `price_band` (enum, ETB-relative), `attributes` (wifi, outdoor seating, jebena service, espresso bar, takeaway, parking)
- `status` — `pending`, `live`, `hidden`, `closed`, `merged`
- `submitted_by`, `check_ins_count`, `stamps_count`
- Merged duplicates keep a `merged_into_id` so old links and stamps survive a merge.

**`Neighborhood`** — `name`, `name_am`, `city`, centroid, boundary (optional polygon). Seeded, not user-created.

**`CheckIn`** — one visit.
- `user`, `shop`, `occurred_at`
- `latitude`, `longitude`, `accuracy_meters` — where the *device* was, kept separately from the shop's coordinates
- `distance_meters` — computed at write time, stored, never recomputed
- `status` — `verified`, `flagged`, `rejected`
- `flag_reason`
- `drink`, `rating` (1–5, optional), `note` (short, optional), `photo`
- `idempotency_key` (unique per user)

**`Stamp`** — the collectible. `user`, `shop`, `first_check_in`, `earned_at`. Unique index on `[user_id, shop_id]`. Created by the first `verified` check-in at a shop and never destroyed by later moderation of that check-in.

**`Badge`** / **`Award`** — `Badge` is the definition (slug, name, description, artwork, tier), `Award` is the join to a user with `earned_at`. Badge criteria are evaluated in a background job after each verified check-in, never inline.

### Community data

A single `Contribution` concept with three shapes, using **delegated types** so the moderation queue is one query and one UI rather than three:

**`Contribution`** — `user`, `contributable` (delegated), `status` (`pending`, `approved`, `rejected`, `auto_approved`), `reviewed_by`, `reviewed_at`, `rejection_reason`.

- **`Shop::Submission`** — a proposed new shop. Carries the full proposed attribute set. On approval, creates or activates the `Shop`.
- **`Shop::Edit`** — a proposed change to a live shop. Stores a field-level diff, not a whole record, so two people editing different fields don't conflict.
- **`Shop::PhotoSubmission`** — a proposed photo.

**`Report`** — `user`, `reportable` (shop, photo, check-in, or user), `reason` enum, `note`. Feeds the same queue.

### Trust and moderation

`User#trust_level`, earned automatically, never granted by vibes:

| Level | Name | Earned by | Can do |
|---|---|---|---|
| 0 | `newcomer` | signup | Submit shops and edits — everything queues. Max 2 submissions/day. |
| 1 | `regular` | 10 verified check-ins across ≥5 shops | Edits to existing shops auto-apply. New shops still queue. 5 submissions/day. |
| 2 | `curator` | 50 verified check-ins, ≥20 shops, ≥5 approved contributions, zero upheld reports | New shops go live immediately. Can approve others' contributions. Can merge duplicates. |
| 3 | `moderator` | granted by staff | Everything, plus reversing decisions and adjusting trust levels. |

Plus a **two-confirmation rule**: a pending shop from a `newcomer` also goes live if two independent `curator`+ users approve it. This keeps the queue moving without us staffing it daily.

Promotion is evaluated in a background job. Demotion is manual and rare, but a user with upheld reports against them drops to 0 automatically.

### Duplicate prevention

This is the failure mode that kills community-sourced venue databases, so it is handled at submission time, not by cleanup later.

On submit, before the record is accepted, the server searches for existing shops within **200m** whose name is similar to the proposal — where "similar" means normalized comparison across both scripts, tolerant of transliteration variance (Tomoca / Tomoka / To.Mo.Ca / ቶሞካ all collapse to the same key). If candidates exist, the API returns them and the client must show *"Is it one of these?"* before it can force the submission through. A forced submission past a near-match is auto-flagged for review regardless of the submitter's trust level.

Merging is non-destructive: the loser gets `merged_into_id`, its check-ins and stamps repoint to the winner, and duplicate stamps collapse to the earliest.

---

## 8. Check-in verification

Server-side rules only. No third-party attestation SDK in v1 — those are a v2 hardening step (Play Integrity / App Attest), not a launch requirement.

The client submits its coordinates and reported accuracy. **The server decides everything.** The client is never told the shop's exact radius or the thresholds, and never computes the result.

Rules, applied in order:

| Rule | Threshold | Result if violated |
|---|---|---|
| Reported GPS accuracy | ≤ 100m | `rejected` — "weak GPS signal, try again outside" |
| Distance to shop | ≤ 250m | `rejected` — "you're too far from this shop" |
| Cooldown, same shop | ≥ 4 hours since last check-in here | `rejected` — "you already checked in here recently" |
| Daily cap | ≤ 8 check-ins per user per day | `rejected` — "daily limit reached" |
| Implausible travel | required speed since last check-in ≤ 120 km/h | `flagged` |
| Device reports mock location | — | `flagged` |
| Brand-new account velocity | > 3 check-ins in first hour | `flagged` |

**250m, not 50m.** GPS in dense Addis with tall buildings is genuinely imprecise, and a false rejection at the counter is far more damaging than a permissive radius. The radius stops couch check-ins, which is its actual job.

**`flagged` vs `rejected`:** rejected check-ins are refused outright. Flagged ones are saved, appear in the user's own history, earn the stamp — but are **excluded from every leaderboard and from badge criteria**, and land in the moderation queue. The user is not told they were flagged. This makes leaderboard gaming unrewarding without making the app feel hostile to someone whose phone just has bad GPS.

**Idempotency:** every check-in carries a client-generated key, uniquely indexed per user. A retry on a flaky connection returns the original check-in, not a new one.

---

## 9. Leaderboards

Scopes: **city**, **neighborhood**, **friends** (v2). Periods: **this week**, **this month**, **all time**. Metrics: **cups** (verified check-ins) and **shops stamped**.

Not computed live. A `LeaderboardEntry` table is refreshed by a recurring Solid Queue job — every 15 minutes for weekly boards, hourly for all-time. Ranking queries then hit one indexed table. This is cheap, cacheable, and means a leaderboard read never scans the check-ins table.

Only `verified` check-ins count. Ever.

---

## 10. API

Versioned JSON at `/api/v1`. Bearer token from `Session`.

Design rules:

- **Incremental sync.** `GET /api/v1/shops?updated_since=<timestamp>` returns only changed records plus a list of deleted/merged IDs. The client holds the whole Addis dataset locally and stays current cheaply. This is the single most important endpoint for a market with expensive data.
- **ETags and conditional GETs** everywhere. A no-op sync should cost one 304.
- **Explicit image variants.** Every photo serialises with `thumb`, `medium`, `full` URLs; the client chooses. Never ship a full-size image by default.
- **Lean payloads.** The shop list returns what the map needs. Detail is a separate request.
- **Errors are structured** — machine-readable code plus a human string, because check-in rejections need distinct client handling per reason.

Surface:

```
POST   /api/v1/sessions                     sign in
DELETE /api/v1/sessions/current             sign out
POST   /api/v1/users                        sign up

GET    /api/v1/shops?updated_since=&bbox=   sync / map
GET    /api/v1/shops/:id
POST   /api/v1/shops                        submit new (may return duplicate candidates)
POST   /api/v1/shops/:id/edits              suggest an edit
POST   /api/v1/shops/:id/photos

POST   /api/v1/check_ins                    idempotency_key required
GET    /api/v1/check_ins                    own history

GET    /api/v1/passport                     stamps + progress
GET    /api/v1/profile
GET    /api/v1/badges

GET    /api/v1/leaderboards?scope=&period=&metric=

POST   /api/v1/reports
```

---

## 11. Web console

The Rails app is **not** only an API. It also serves a server-rendered Hotwire console for the founding team and moderators:

- Moderation queue — one list, all contribution types, approve/reject/merge
- Shop management and fast bulk seeding
- Duplicate review and merge tooling
- User trust level management
- Flagged check-in review
- Basic dataset health dashboard

This is deliberate and load-bearing. It means **the entire domain model can be built, exercised, and proven before a single line of mobile code exists** — which is exactly the phasing that was asked for. It also means seeding Addis doesn't wait on the app.

---

## 12. Stack

Rails 8 defaults, hard. The Codex skeleton already has most of this and the dependency choices are fine even though its domain modelling is discarded.

- **Rails 8.1**, Ruby 3.4
- **SQLite** in production. With hundreds — even tens of thousands — of shops, a bounding-box prefilter plus haversine is instantaneous, and Rails 8 makes SQLite genuinely production-viable. Postgres + PostGIS is the documented migration path if we ever go multi-country; we do not pay that complexity now.
- **Solid Queue / Solid Cache / Solid Cable** — no Redis
- **Active Storage** for photos, with variants
- **Hotwire** for the console
- **Kamal** for deploy
- **Minitest**, fixtures, no RSpec, no FactoryBot

Principles:

- Fat models, skinny controllers. No `app/services`.
- Concerns for genuinely shared behaviour (`Reviewable`, `Locatable`, `Reportable`).
- Delegated types for the contribution hierarchy.
- Business rules live in the model, tested at the model level. Controllers do auth, params, and rendering.
- Background jobs for anything a user shouldn't wait on: badge evaluation, trust promotion, leaderboard refresh, image processing.
- Database constraints alongside validations. Uniqueness on `[user_id, shop_id]` for stamps and on `idempotency_key` is enforced by the index, not just by Rails.

---

## 13. Cold start

The hardest problem in the document. An empty map is a dead app, and no verification design or badge system saves it.

1. **Seed 80–120 Addis shops before any public launch.** Sprudge's Addis guide, existing Google Maps entries where they exist, local Instagram coffee accounts, and direct legwork. Use the web console — this is why it's built first.
2. **Every seeded shop needs at least one photo and a landmark.** A pin with no photo teaches users the app is empty.
3. **Recruit 10–20 founding contributors** from the Addis coffee scene before opening signups. Give them `curator` from day one and a permanent founding badge. The 2–5% contributor ratio means a public launch with zero contributors produces zero data.
4. **Launch one neighborhood at a time.** Bole first — highest café density, most concentrated target audience. A complete Bole beats a sparse Addis.
5. **Completion is the hook.** "You've been to 12 of 47 shops in Bole" is a far stronger motivator than an open-ended map, and it's why neighborhoods are a first-class model.

---

## 14. Open questions

Resolve before or during Phase 1; none block starting.

1. **Monetization** — deliberately undecided. The model must not foreclose it: keep `Shop` ownable by a future `ShopAccount`, and keep the `Trail` concept in mind as the paid-passport analog. Revisit once the Addis dataset is real.
2. **Auth beyond email** — phone/OTP is right for the market but SMS delivery to Ethiopia is a genuine vendor problem. Telegram login is a credible alternative worth investigating. Phase 1 ships email/password; the model stays open.
3. **Level and tier naming** — Abol/Tona/Bereka is taken by an app in our niche. Need a different progression vocabulary.
4. **Social handles and domain** — lock a consistent handle across platforms and register the domain. Do this now, it's the cheapest item here.
5. **Shop hours accuracy** — community-maintained hours go stale fast. Possibly defer hours entirely to v2 rather than show wrong ones.
6. **Photo moderation at volume** — manual review works at launch scale and doesn't at 1000 photos/day. Revisit when it hurts.

---

## 15. Success metrics

**Dataset health — the thing that actually matters.**
- Live shops in Addis (target: 150 by end of Phase 2)
- % with ≥1 photo (target: >80%)
- % with landmark directions (target: >90%)
- Median moderation queue latency (target: <24h)
- Duplicate rate among live shops (target: <2%)

**Engagement**
- D7 and D30 retention
- Check-ins per weekly active user
- % of users who reach 5 stamps (the point where the passport starts pulling)

**Data integrity**
- Verified vs flagged check-in ratio (a rising flag rate means we're being gamed)
- Contributions per active contributor
- Approval rate by trust level (validates the thresholds)

---

## 16. Phases

- **Phase 0 — done.** Positioning, prior art, naming, this document.
- **Phase 1 — Rails backend.** Domain model, moderation, check-in verification, API, web console. Fully tested. No mobile app.
- **Phase 2 — seed Addis.** Founding contributors, 100+ shops, Bole complete. Backend hardening against real data.
- **Phase 3 — mobile app.** Platform choice deferred; Android matters more than iOS in this market.
- **Phase 4 — v2 features.** Social graph, trails, shop accounts.
