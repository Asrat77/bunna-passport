# Bunna Passport — Mobile Design Spec

**Status:** Redesign implemented locally; Android device QA and Mapbox credentials pending.
Companion to `docs/SPEC.md` (product source of truth).
This document defines the visual system, onboarding, gamification presentation,
and screen-level UX for the mobile client. It is framework-agnostic but
Android-first: units are dp, the interaction baseline is Material 3, and every
flow is designed for a mid-range Android phone on expensive, patchy data.

**Last updated:** 2026-08-01

---

## 1. Design principles

Five principles, in priority order. When two conflict, the higher one wins.

1. **The map is the product; the passport is the reward.** Every screen should
   either help someone find coffee or make progress feel good. Nothing else
   earns pixels.
2. **Never punish the network.** Every screen has a designed offline state, a
   designed stale state, and a designed syncing state. No spinner ever blocks
   browsing data we already have. Images are opt-in on metered connections.
3. **Both scripts are first-class.** Amharic is not a translation layer — shop
   names, neighborhoods, and the app itself render ቶሞካ and Tomoca side by side.
   Type, spacing, and truncation rules are designed for Ethiopic first, because
   Latin always fits where Ethiopic does, and never the reverse.
4. **Warmth over gloss.** This is a coffee ceremony culture, not a fintech app.
   The aesthetic is warm, tactile, and crafted — but modern: bold type, real
   photography, generous whitespace. No skeuomorphic leather, no toy-like clay.
5. **Generous verification, honest failure.** GPS in Addis is imprecise and the
   server is deliberately permissive (250m). When a check-in fails, the message
   says exactly why and what to do, in friendly language, in both scripts.
   Nothing ever feels like an accusation.

---

## 2. Visual identity

### 2.1 Direction: “Modern Ceremony”

A contemporary take on Ethiopian coffee culture. Think: specialty-café menu
design, not airline loyalty app. The passport/stamp metaphor is expressed
through **ink-stamp motifs, circular seals, clipped paper geometry, and
paper-warm surfaces** — graphic and tactile, never fake leather or generic
glassmorphism. The system should feel designed in Addis rather than reskinned
from a global loyalty template.

Signature elements:

- **The stamp** — each shop gets a generated SVG seal: twin rings, dotted ink
  rhythm, small coffee-leaf cuts, and script-aware initials. A deterministic
  0–2° rotation keeps a passport page feeling printed without random layout
  movement. Unstamped shops appear as dashed-outline placeholders — visible
  absence is the completion hook.
- **The mark** — an interim SVG jebena-and-coffee-bean mark carries onboarding,
  authentication, placeholders, and empty states. It is an implemented product
  mark, not yet the final store-listing brand identity.
- **Paper-warm surfaces** — backgrounds lean cream/latte in light mode, deep
  roast in dark mode. Never pure white, never pure black (except AMOLED
  option, §9).
- **Ink accents** — progress, seals, and celebratory moments use a deep
  espresso ink + a warm amber highlight.

### 2.2 Color

Light mode (default):

| Token | Hex | Use |
|---|---|---|
| `surface` | `#F6F0E6` | App background (warm paper) |
| `surface-raised` | `#FFFBF5` | Cards, sheets |
| `ink` | `#22140F` | Primary text (espresso) |
| `ink-muted` | `#665047` | Secondary text |
| `primary` | `#872F1D` | Clay-red ink — buttons, active nav, seals |
| `on-primary` | `#FFF8ED` | Text/icons on primary |
| `accent` | `#D99A24` | Saffron — progress and high-attention moments |
| `accent-soft` | `#F7E8BF` | Illustration fields and quiet emphasis |
| `positive` | `#2F684F` | Verified, success, open-now |
| `caution` | `#8D520B` | Stale data, weak GPS |
| `negative` | `#A22C2C` | Rejections, closed, errors |
| `map-water/land` | desaturated warm greys | Map style must recede behind pins |

Dark mode (“Dark Roast”) mirrors the same roles: `surface #17100C`,
`surface-raised #211812`, `ink #F7EBDD`, `primary #F0A05D` (amber-shifted so it
passes 4.5:1 on dark), `accent #F3B542`. Every pairing in both modes must pass
WCAG AA 4.5:1 for text and 3:1 for large text/icons — verify with tooling, not
by eye.

Rules:
- Color is never the only signal (verified ✓ icon + color; closed = label + color).
- One amber, one green, one red. No decorative rainbow badges — badge tiers
  differentiate by artwork and metal tones (§6.3), not by inventing new
  semantic colors.

### 2.3 Typography

Two type roles, each with a Latin + Ethiopic pairing that ships in the app
(never rely on system Ethiopic fonts — Android coverage is inconsistent):

| Role | Latin | Ethiopic | Notes |
|---|---|---|---|
| Display / passport | **Geist** (SemiBold/Bold) | **Noto Serif Ethiopic** (SemiBold) | Sharp modern Latin display paired with a serif fidel voice for seals and ceremonies |
| UI / body | **Geist** (Regular/Medium/Bold) | **Noto Sans Ethiopic** (Regular/Medium/Bold) | Everything else |

Rules:
- **Ethiopic sets the vertical rhythm.** Line-height 1.6 minimum for any line
  that can contain Amharic (Ethiopic glyphs are taller and denser than Latin);
  never tighter than 1.4 anywhere.
- Minimum body size 16sp; minimum anywhere 12sp (timestamps only). Respect the
  OS font-scale setting up to 200% — every layout must survive it.
- Bilingual name lockup: primary script large, secondary script below at 70%
  size in `ink-muted`. Which script is primary follows the app language
  setting, not the shop record.
- Numerals: tabular figures for counters and leaderboards so numbers don’t
  jitter as they tick up.

### 2.4 Iconography, imagery, and shape

- Single icon set: **Material Community Icons**, outline by default and filled
  for active navigation. No emoji as interface icons.
- Photography is the hero: shop photos edge-to-edge in cards with a subtle
  warm-tone overlay for text legibility. Never stretch, never letterbox; crop
  center-weighted.
- Shape scale: 12dp radius (inputs, small cards), 16dp (cards, sheets), 28dp
  (bottom sheets, dialogs), full-round (chips, FAB, seals).
- Elevation: prefer borders + tonal shifts over heavy shadows; max two
  elevation levels per screen.

---

## 3. Information architecture

Four tabs + one hero action. A single raised paper dock replaces the stock
Material bar plus disconnected floating pill. The action grows out of the
center notch on Explore and Passport; active tabs use a clay-soft capsule.
Labels always remain visible — discoverability still beats minimalism.

```
┌──────────────────────────────────────────────┐
│                 (screen content)             │
│                                              │
│  ┌────────┬─────────┬─────────┬───────────┐  │
│  │Explore │ Passport│CHECK IN │ Boards │Profile│
│  └────────┴─────────┴────┬────┴───────────┘  │
│                          └ hero action         │
└──────────────────────────────────────────────┘
```

- **Explore** — map + list of shops (the default tab, works signed-out)
- **Passport** — stamps, neighborhood completion, cups, streak
- **Boards** — leaderboards (works signed-out; own rank requires account)
- **Profile** — stats, badges, contributions, trust standing, settings
- **Check In** — a 62dp clay-red control integrated into the dock, visible on
  Explore and Passport. The single most important action gets the single most
  prominent affordance without reading as a second navigation system.

Contribution actions (add shop, suggest edit, add photo, report) live in
context — on shop detail and map — not as a tab. Contributors are 2–5% of
users; their entry points are contextual, their *status* is celebrated in
Profile.

---

## 4. Onboarding

### 4.1 The rule: value before identity

The backend already exposes shops and leaderboards without auth. The client
exploits this fully: **a first-time user sees real Addis coffee shops within
seconds of opening the app, before any account exists.**

Time-to-value budgets (mid-range Android, 3G):
- Cold start → interactive map with cached seed catalog: **< 5s**
- First open → real nearby shops visible: **< 30s**
- First open → first check-in (if they’re in a café): **< 90s**

### 4.2 First-run sequence

**No carousel. No tutorial. Show the product.**

1. **Splash → language.** One screen, first launch only: “ቋንቋ ይምረጡ / Choose
   your language” — አማርኛ / English, two large cards, changeable later.
   A full clay-red hero, interim jebena mark, bilingual wordmark, and offset
   seal make this the brand moment. The choices sit in a raised paper sheet.
   No “Next”.
2. **Straight into Explore.** The map opens on Bole (highest density) with the
   bundled catalog already rendered — pins, real shop names in both scripts.
   A single dismissible overlay chip: “**112 coffee shops in Addis — built by
   people like you**”.
3. **Location, primed in context.** No permission dialog at launch. A soft
   “Near me” chip sits on the map. Tapping it shows a one-sentence primer
   (“We use your location to sort shops by distance and verify check-ins —
   never in the background”) → then the OS dialog. Denial degrades gracefully:
   neighborhood picker (“Which area are you in?”) instead of GPS sort.
4. **Browse freely.** List, map, search, shop detail, leaderboards — all open.
   No nagging. The only locked affordances are Check In, Passport, and
   contributions, each showing the same soft gate.
5. **The gate is the pitch.** When the user taps **Check In** (or Passport):
   a bottom sheet — passport artwork, “**Start your passport** — stamp this
   café and every one you visit”, then Create account / Sign in. Email +
   password + handle, one screen, inline validation, show-password toggle.
   No email verification blocking first use.
6. **First check-in = onboarding complete.** The first stamp ceremony (§6.2)
   ends with a one-time line: “That’s stamp 1. There are 46 more shops in
   Bole.” — teaching completion in one sentence, in the moment it matters.

### 4.3 Empty & cold states as onboarding

- **Passport, 0 stamps:** not a blank grid — a full dashed-outline page of the
  user’s nearest neighborhood’s seals with “12 shops in Bole are waiting for
  their first stamp from you”, plus the 3 nearest as tappable cards.
- **Boards, signed-out / unranked:** show the real city board; the user’s own
  row renders as a ghost slot: “Check in once to enter this week’s board.”
- **A neighborhood with few shops:** “Only 3 shops mapped in Gerji so far —
  know one that’s missing?” → Add shop. Sparse data is recruited into the
  contributor funnel instead of looking dead.

### 4.4 What we never do

No unskippable tours. No notification-permission ask before the first stamp
(ask after — the moment the passport has value). No email verification wall.
No coach marks beyond a max of two one-time tooltips (Check In pill, passport
completion ring). No interstitials, ever.

---

## 5. Core flows

### 5.1 Explore (map + list)

- **Map and list are one tab**, toggled by a persistent segmented control;
  state (region, filters, scroll) survives the toggle. Default view: map.
- Pins: circular SVG mini-seals. Stamped shops render filled (clay ink);
  unstamped render outlined. The map itself shows your progress — the
  “fill in the map” loop made literal. Clustered at low zoom with counts.
- Tapping a pin → **peek card** (bottom-anchored): photo thumb, bilingual
  name, neighborhood + landmark, distance, open/closed, stamp status. Tap
  again or swipe up → full shop detail. Peek keeps map context; detail is a
  push.
- List rows: 72dp min height — thumb (opt-in on metered), bilingual name
  lockup, neighborhood • landmark, distance, price band in birr glyphs
  (፞ብር-based band indicator, not “$$”), stamp seal if earned.
- The top surface pairs a compact `BUNNA PASSPORT / Explore` lockup with a
  persistent map/list segmented control. Search and filters remain below it,
  preventing view state from disappearing into an icon-only toggle.
- **Search** matches both scripts and loose transliteration (server-backed;
  client normalizes locally over the cached catalog when offline). One search
  field, no script toggle — typing “tomoka”, “To.Mo.Ca”, or “ቶሞካ” all hit
  Tomoca. Recent searches and neighborhood chips below the field.
- **Filters as chips, not a panel:** Near me · Open now · Not stamped yet ·
  Neighborhood · price band. “Not stamped yet” is the gamified filter — it
  turns the map into a to-do list.
- Landmark-first directions: shop detail shows “Behind Edna Mall, second
  gate” as the primary wayfinding line, with coordinates handed to the map
  app only as a secondary “Open in maps” action.

### 5.2 Shop detail

Order of information = order of user questions:

1. Photo strip (thumb-quality by default; tap loads full — §7)
2. Bilingual name lockup + neighborhood + open/closed + price band
3. **Stamp status band** — either the earned seal with date (“Stamped
   14 Mar 2026 · 4 visits”) or the dashed seal with “No stamp yet — check in
   to earn it”
4. Landmark directions + mini-map + “Open in maps”
5. Attributes (wifi, outdoor, jebena service, espresso bar, takeaway, parking)
   as icon chips; hours (if trusted — see SPEC open question 5)
6. Community strip: recent check-in photos, drink tags, avg rating
7. Contribution footer: “Something wrong? Suggest an edit · Add photo ·
   Report” — quiet text actions, not buttons.

### 5.3 Check-in — the hero flow

Entry: the Check In pill (auto-selects nearest candidate) or a shop detail
button (pre-selected). Designed as a **state machine matching the API
contract**, with an idempotency key generated the instant the flow opens.

```
open → locating → candidate confirm → submitting → result
```

1. **Locating.** Full-height sheet, animated radar sweep over a mini-map.
   Live GPS accuracy shown honestly: “Accuracy ±38m ✓” vs “±140m — step
   outside or near a window” (client-side pre-warn at >100m, mirroring the
   server rule so a doomed submit is caught before the round-trip).
2. **Candidate confirm.** Nearest shops (≤250m) as cards; nearest
   pre-selected. One tap on **“Stamp it”** / already-stamped shops show
   **“+1 cup”** — the button label teaches the stamp-vs-cup model. Optional,
   collapsed-by-default extras: drink chips (macchiato, buna, spris…), 1–5
   rating, note, photo. **Zero required fields beyond the tap.**
3. **Submitting.** Button morphs to progress; sheet stays interactive-blocked
   ≤ 2s before showing “Still trying — weak connection” with cancel. Retries
   reuse the idempotency key; a retry can never double-stamp, so the UI can
   retry aggressively without fear.
4. **Result states**, mapped 1:1 to server codes:
   - `verified` + first visit → **stamp ceremony** (§6.2)
   - `verified` + repeat → compact cup animation: “+1 cup ☕ 47 total”,
     streak tick if applicable. 1.5s, non-blocking.
   - `rejected/weak-gps` → “Weak GPS signal — try again outside” + Retry
   - `rejected/too-far` → “You’re too far from {shop}” + “At a different
     café?” → candidate list
   - `rejected/cooldown` → “Already stamped here today — come back after
     {time}” (friendly, shows their existing stamp)
   - `rejected/daily-cap` → “That’s 8 cafés today — even we’re impressed.
     Resets at midnight.”
   - Offline/timeout → “Saved — we’ll keep trying” with a visible queued
     state on Passport; auto-retry on reconnect (idempotent, so safe). If it
     ultimately fails server rules, a quiet notification explains why.
   - Flagged check-ins are **never** surfaced as flagged (server rule: user
     is not told). The client shows normal success.

### 5.4 Contribution flows

- **Add shop:** map-pin drop first (pin where the door is), then a 3-step
  sheet: names (Latin and/or Amharic, either sufficient), neighborhood
  (pre-filled from pin) + landmark, optional photo/attributes. Progress
  “Step 2 of 3”.
- **Duplicate interstitial:** when the API returns candidates: “Is it one of
  these?” — photo cards with names in both scripts + distance. “Yes, that’s
  it” → jumps to that shop (and offers an edit). “No, mine is different” →
  submits (auto-flagged server-side; the user just sees “Submitted for
  review”).
- Post-submit: honest queue expectations — “A curator will review this,
  usually within a day. You’ll get the Founder’s Mark for {shop} if it’s
  approved.” (First-submitter credit is permanent shop provenance.)
- **Suggest edit:** field-level — tap the wrong field, fix that field.
  Never a full re-entry form.

---

## 6. Gamification system

### 6.1 The two-counter contract

Everything visual reinforces the SPEC’s central model — stamps = breadth,
cups = volume — and never blurs them:

| | Stamps | Cups |
|---|---|---|
| Visual language | Circular seals, serif, ink | Counter numerals, amber |
| Home surface | Passport tab | Passport header + Boards |
| Celebration | Full ceremony (first visit) | Compact +1 tick (every visit) |
| Filter/nudge | “Not stamped yet”, completion rings | Streaks, weekly boards |

### 6.2 The stamp ceremony

The signature moment of the app; budgeted as such (and fully replaced by a
static reveal under reduced-motion):

1. Sheet clears; shop’s seal scales in with an **ink-press**: slight
   overshoot, radial ink-bleed edge, single strong haptic (the “thunk”).
2. Seal settles onto its passport-page slot; neighborhood completion ring
   ticks up with count (“13 of 47 in Bole”).
3. One-line context beneath: rarity or milestone when true (“Only 41 people
   have stamped this shop”, “Your 10th stamp!”), otherwise just the
   date+shop line. Never fabricated hype.
4. Actions: **Done** (primary) · Share card (renders a branded 4:5 image:
   seal, shop bilingual name, count — no user location beyond neighborhood).

Total ≤ 2.5s to actionable. Skippable by tap anywhere from 0.8s.

### 6.3 Badges

- Tiers by artwork + material tone (bronze/steel/gold treatment on the same
  mark), not by color-coding categories.
- Grid on Profile: earned in full color; unearned as embossed silhouettes
  with progress bars (“7/10 neighborhoods visited”) — visible absence again.
- Badge award moment rides *after* the stamp ceremony (queued, never
  simultaneous), as a card slide-in: “Badge earned — Piassa Regular”.
- Categories at launch (definitions live server-side): breadth (stamps,
  neighborhoods), volume (cups, streaks), contribution (approved shops,
  photos, edits), founding (seeded contributors).

### 6.4 Streaks — forgiving by design

Weekly, not daily. “Coffee weeks”: any verified check-in Mon–Sun keeps the
week alive. Data poverty and Addis life make daily streaks hostile; weekly
streaks are achievable and still habit-forming. Streak flame (amber) on the
Passport header with week count; a lost streak resets quietly — no shame
screens, no paid streak-freeze dark patterns, no loss-aversion notifications.

### 6.5 Leaderboards

- Scopes: city / neighborhood; periods: week / month / all-time; metrics:
  cups / shops stamped. Defaults to **This week · Your neighborhood ·
  Cups** — the board a new user can actually climb.
- The user’s own row is always pinned-visible at the bottom of the viewport
  with rank delta (“#23 ▲4 this week”), even when unranked (ghost row, §4.3).
- Top 3 get seals-on-podium treatment; everyone else is a clean table.
  Handles + avatars only — no real names.
- Weekly reset framed as opportunity: Monday state “Fresh board — first
  check-in leads.”

### 6.6 Contributor standing

Trust levels (SPEC §7) surface as **titles on the profile** with a progress
track (“Regular — 31/50 verified check-ins to Curator”). Naming vocabulary is
an open product item (Abol/Tona/Bereka is off the table); placeholder:
Newcomer / Regular / Curator / Moderator until decided. Approved
contributions render as a portfolio (“Shops you put on the map: 4”) — the
identity payoff that recruits the 2–5%.

### 6.7 Ethics line

No fake scarcity, no countdown pressure, no pay-to-advance, no punitive
streaks, no leaderboard shaming, no notification more than once/day, and
every gamification surface is skippable. The passport should feel like a
hobby, not a slot machine.

---

## 7. Offline & data-frugal UX

- **Bundled seed catalog** ships in the APK (shops, neighborhoods, seal data,
  *no photos*) so first launch works with zero network. Incremental
  `updated_since` sync + ETags thereafter; a no-op sync costs one 304.
- **Freshness indicator, not blocking sync:** subtle “Updated 2h ago” pill on
  Explore; pull-to-refresh forces sync. Sync failures degrade to stale data
  + caution pill, never an error wall.
- **Image policy:** `thumb` by default everywhere; `medium/full` load
  on-demand per tap. On metered connections (detected), photo strips show
  blurhash placeholders with explicit “Load photos (≈120KB)” — spend the
  user’s money only with consent. Wi-Fi: load freely. A “Data saver” toggle
  in settings forces the metered behavior always.
- **Offline states:** browsing works fully offline (cached catalog + cached
  own passport). Check-in requires network but queues idempotently (§5.3).
  Signed-out actions that need network show “You’re offline — this needs a
  connection” inline, never a modal.
- Skeletons reserve exact layout space (no content jumping); lists paginate
  by cursor; leaderboards cache last-known with timestamp.

---

## 8. Motion & haptics

| Tier | Duration | Easing | Examples |
|---|---|---|---|
| Micro | 120–200ms | standard ease-out | chips, toggles, button press |
| Transition | 250–350ms | emphasized decelerate | sheet open, tab cross-fade, peek→detail |
| Ceremony | 600–900ms | custom overshoot | stamp press, badge slide-in, completion ring |

- Haptics: light tick (selection), medium (check-in submit), strong single
  “thunk” (stamp lands), double-tick (badge). Never vibrate for errors.
- Reanimated 4 runs the radar, skeleton pulse, and stamp ceremony on the UI
  thread. Expo SDK 57 configures its Worklets Babel plugin automatically; no
  hand-maintained `babel.config.js` is required.
- All ceremony-tier motion honors `reduced-motion` with static reveals.
- Animate only transform/opacity; 60fps on a mid-range device is a release
  gate, not an aspiration.

---

## 9. Accessibility & localization

- Touch targets ≥ 48×48dp; primary actions in thumb reach (bottom 60% of
  screen); destructive actions never adjacent to primary ones.
- Contrast: AA everywhere (verified in both modes); TalkBack labels on every
  actionable element; check-in flow fully completable via screen reader —
  test this explicitly, it’s the hero flow.
- Full OS font-scaling support to 200%; layouts tested at 200% with Amharic.
- Language: full UI in Amharic and English, switchable in settings without
  restart. Dates/numbers localized; ETB always as ብር.
- Ethiopic QA gate: every release visually verified on the oldest supported
  Android version for fidel rendering (no tofu, no clipped ascenders).
- Optional AMOLED true-black theme (battery is a real user cost).
- Device floor (proposed, pending approval): Android 8.0 / 2GB RAM class;
  app size target < 25MB installed before photos.

---

## 10. Component inventory (build-order reference)

Foundation: color tokens (light/dark) · build-time Geist/Noto type scale
(dual-script) · spacing (4dp grid) · radius scale · icon set · haptic map.

Components: bilingual name lockup · jebena brand mark · SVG seal
(earned/dashed/mini-pin variants) ·
completion ring · shop card (row + peek + grid) · chip set (filter, drink,
attribute) · bottom sheet · check-in pill FAB · stat counter (tabular,
tick-up) · leaderboard row (+ pinned self) · badge tile · progress track
(trust) · freshness pill · offline banner · empty-state template (art +
one-liner + action) · error-state template · share card renderer ·
skeleton set.

Each component ships with: both scripts, both themes, RTL-safe layout
(future-proofing), 200% font scale, and offline/loading/error states.

---

## 11. Open design decisions (need user input)

1. **Brand mark** — an interim vector jebena/bean mark now exists in the app.
   Decide whether to commission/refine it before the store listing.
2. **Trust-level vocabulary** (SPEC open item 3) — affects Profile copy.
3. **Mapbox offline launch policy** — provider is decided and the client now
   uses `@rnmapbox/maps` with Mapbox Standard in a faded dawn/night treatment.
   Production still needs two uncommitted credentials: a public runtime token
   (`EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`) and a secret native-SDK download token
   (`RNMAPBOX_MAPS_DOWNLOAD_TOKEN`, supplied through EAS/local environment).
   Current Maps SDK pricing is MAU-based after its free tier, so this adds a
   recurring cost to a product with no decided revenue model. Mapbox supports
   offline regions but caps cumulative unique tile packs at 750; define and
   test the Addis pack region/zoom budget over Wi-Fi before release. Until that
   policy is implemented, the SQLite list remains offline-capable but the map
   is not a complete offline experience.
4. **Share card branding** — needs the handle/domain decision from SPEC §2
   (locked social handle) before we print it on shareable images.
5. **Amharic copy voice** — needs a native-speaker review pass; machine-drafted
   Amharic UI strings are a launch blocker, not a nice-to-have.

   `mobile/scripts/i18n-review.mjs` carries the round trip. `npm run i18n
   export` writes a spreadsheet a reviewer can open anywhere and fill in;
   `npm run i18n import` writes their answers back and records which keys a
   human has approved. `npm run i18n status` reports how many are left, so the
   blocker is a number rather than a warning comment. A string counts as
   approved only when a person put it in that column — never because it looked
   plausible.

---

## 12. What this spec deliberately excludes

Merchant surfaces, rewards/offers, social feed, trails UI, written reviews,
coffee education, other cities — all per SPEC §5 exclusions. The design
system (neighborhood pages, seals, trails-shaped completion rings) is built
so trails and a second city slot in without a redesign, but no v1 pixel is
spent on them.
