# Sprint: The Passport Is the Product

*Drafted 2026-08-08. Builds on [SPEC.md](../SPEC.md) and [DESIGN.md](../DESIGN.md);
section references point there. One sprint of work for one backend dev plus one
mobile dev, sequenced so neither blocks the other.*

## Why this sprint

The mechanics are complete: discover → verify → stamp → level → board. The
production numbers say what is missing — 62 shops, 2 users, 1 stamp, 0 photos,
0 reviews. Community features are worth nothing until there is a community,
and that is months away. What we control today is whether one person, alone,
has an experience worth keeping and worth showing to a friend.

So this sprint makes three bets:

1. **The passport reads as a coffee diary, not a completion meter.** Most real
   users will be regulars with two or three cafés in their life, not
   collectors chasing all 62. The UI currently speaks almost entirely to
   collectors. A diary is honest at 3 shops; a completion meter mocks you.
2. **The stamp moment produces something shareable.** Word of mouth is the
   only distribution we have in Addis, and today nothing leaves the app. The
   emotional peak — the ceremony — should end with a card someone posts to a
   WhatsApp status.
3. **The stamp moment seeds the review corpus.** Reviews ship but sit at zero
   because rating a visit is buried behind a pre-submit toggle. Ask right
   after the stamp lands, while the feeling is fresh.

Everything else — trust-level autonomy, streaks, badges expansion, merchant
anything — is deliberately out (see §Out of scope).

## Decisions this sprint needs from the founder

| # | Decision | Blocks | Fallback if undecided |
|---|----------|--------|----------------------|
| 1 | Social handle + domain (SPEC §14.4, DESIGN §11.4) | Share card footer | Card ships with the wordmark and app name only; handle added later without redesign |
| 2 | Who reviews the Amharic, and by when | Workstream D3 | Sprint still ships; the launch blocker just doesn't shrink |

Neither decision blocks starting. Decision 1 is "the cheapest item here" per
SPEC §14 and has been open since Phase 0 — this sprint is the forcing function.

---

## Workstream A — Passport redesign: regular-first

**File:** `mobile/src/app/(tabs)/passport.tsx`. No backend changes; every
field needed already ships in `GET /passport` (level, `check_ins_count`,
`visits_to_next_level`, `earned_at`) and the local `stamps` cache mirrors it.

### A1. Screen order (signed-in, ≥1 stamp)

Top to bottom:

1. **Header** — unchanged.
2. **Your places** *(new, replaces the hero card as the lead)* — the user's
   stamped shops ordered by `check_ins_count` descending, capped at 3. Each
   row: seal at level metal, bilingual name, `{count} cups here`, and — when
   `visits_to_next_level` is non-null — a quiet progress line
   `{n} more visits to {next level}`. Tapping opens the shop. This is the
   diary: the shops you actually live in, leading with how well you know them.
3. **Identity strip** — the existing ProgressRing card, demoted to second
   position and reframed: cups total leads, stamps count second, city
   completion becomes the ring's caption rather than the headline.
4. **Neighborhood progress** — unchanged (collector layer, now tertiary).
5. **Seal grid** — unchanged mechanics, one change: sort earned seals by
   `check_ins_count` descending instead of API order, so your gold shop is
   the first seal you see.

### A2. States

- **0 stamps** — unchanged empty state (`passport.empty` + nearby shops).
  "Your places" does not render.
- **1–2 stamps** — "Your places" renders with what exists; no filler, no
  "add more shops" nagging. Small is honest.
- **Signed out** — unchanged gate.

### A3. New strings

```
passport.yourPlaces        "Your places"
passport.cupsHere          "{count} cups here"
passport.toNextLevel       reuse stamp.toNextLevel
passport.cityCaption       "{stamped} of {total} across Addis"
```

Amharic drafts enter the review queue like everything else (see D3).

### A4. Acceptance

- [ ] With stamps at three shops (5, 2, 1 visits), "Your places" lists them
      in that order with correct levels and cup counts.
- [ ] A shop crossing a threshold (5th visit → silver) shows the new metal on
      next passport focus without an app restart.
- [ ] 0-stamp and signed-out states are pixel-unchanged.
- [ ] Screen still renders entirely from cache when offline (DESIGN §7).

---

## Workstream B — The share card

**The growth loop.** After the stamp ceremony, one tap produces an image and
hands it to the OS share sheet. Client-side render only — no server endpoint,
no map tiles, nothing fetched (SPEC §6: data is expensive; also keeps OSM
attribution off the card since no map imagery is used).

### B1. Native dependencies — bundle into ONE rebuild

`react-native-view-shot` (capture) and `expo-sharing` (share sheet) are native
modules, as is the already-installed-but-unbuilt `expo-image-picker`. **One EAS
dev-client rebuild covers all three.** Do this first — it gates B and unblocks
photo upload from the last sprint at no extra cost.

### B2. The card

A dedicated component rendered off-screen and captured via `captureRef`:

- **Dimensions:** 1080×1350 (4:5 — correct for WhatsApp status, IG feed, and
  Telegram without cropping).
- **Composition, top to bottom:**
  - Seal at `lg`, level metal (the `Seal` component as-is)
  - Shop name, both scripts, Amharic first when UI language is Amharic
    (`BilingualName` rules apply — DESIGN §1: both scripts are first-class)
  - `Stamp №{ordinal} · Addis Ababa` — ordinal = the user's `stamps_count`
    after this stamp
  - Date
  - Footer: wordmark + app name; handle/domain appended once Decision 1 lands
- **Palette:** existing tokens, always the light theme — cards are one brand
  artifact regardless of the phone's theme.
- **Never on the card:** coordinates, neighborhood-level location precision,
  the user's handle or real name. The user is announcing a coffee, not
  publishing their whereabouts history. Shop name + city is the ceiling.

### B3. Flow

1. Ceremony completes (existing `StampCeremony`, copy phase done).
2. Buttons become `Share` (primary — the string already exists:
   `checkin.share`) and `Done` (quiet).
3. Share → capture → `Sharing.shareAsync(uri)` → OS sheet. Cancel returns to
   the ceremony; nothing is posted by us, ever — the OS sheet is the boundary.
4. Capture happens only on tap, not preemptively (no work for users who never
   share).

Repeat visits (cup added, no stamp) get no card this sprint — the card
celebrates the stamp. Level-up cards ("TOMOCA is now gold") are an obvious
sequel; out of scope now, noted for next sprint.

### B4. Acceptance

- [ ] Share from a fresh stamp produces a 1080×1350 PNG with correct seal
      metal, both names, ordinal, and date, in ≤1s on the dev device.
- [ ] Amharic UI produces an Amharic-led card; Ethiopic text renders with the
      bundled Ethiopic face, not a system fallback.
- [ ] Cancelling the share sheet returns cleanly; Done still works.
- [ ] Airplane mode: card still generates and hands off to the sheet
      (everything is local).

---

## Workstream C — Say something after the stamp

Reviews surface from verified check-ins (rating/note/drink) but arrive at
creation time behind a collapsed pre-submit toggle almost nobody will open.
Move the ask to the moment after the stamp lands.

### C1. Backend — `PATCH /api/v1/check_ins/:id`

The check-in already exists server-side when the ceremony shows (offline
check-ins queue and never reach the ceremony, so this path is always online).

Contract:

- Auth required; **owner only** (404 for anyone else's).
- Permitted: `rating` (1–5), `note` (≤ existing column norms), `drink`.
- Window: within **24 hours** of `occurred_at` — this is "finish your
  check-in," not an editable review system.
- Refused on `rejected` check-ins (422): rejected visits never speak
  (mirrors the reviews scope).
- Rate limit: 30/day (same family as other write limits).
- **openapi.yml updated in the same commit** — the contract test enforces it.

Tests: owner-only, window expiry, rejected refusal, and that a PATCHed rating
appears in `GET /shops/:id/reviews`.

### C2. Mobile — post-ceremony prompt

After the ceremony copy settles (or on `Done` from the share step):

- One line: `How was it?` + five tappable stars + optional single-line note +
  drink chips (reuse the existing `DRINKS` list).
- **Skippable by scrolling away or tapping Done — zero-friction, no modal, no
  guilt.** One shot: if skipped, no nagging later (a future "your recent
  check-ins" affordance can revisit; not this sprint).
- Submits via the PATCH; failure is silent-with-retry-once, never blocks
  leaving the screen. The stamp is already earned; this must feel like a
  bonus, not a toll.
- The pre-submit extras toggle stays for the people who already use it; the
  PATCH simply overwrites nulls (server: only null fields may be set by a
  later PATCH? No — last write wins on permitted fields, simplest and
  harmless at this scale).

New strings: `afterStamp.howWasIt`, `afterStamp.notePlaceholder`,
`afterStamp.thanks` (+ Amharic drafts into the queue).

### C3. Acceptance

- [ ] Stamp → rate 4 stars → note → the review appears in
      `GET /shops/:id/reviews` and on the shop screen.
- [ ] Skipping leaves nothing behind and never re-prompts.
- [ ] PATCH on someone else's check-in 404s; after 24h 422s; on rejected 422s.
- [ ] Full suite + contract test green.

---

## Workstream D — Debts that ship alongside

### D1. ODbL attribution (legal, overdue)

The 61 imported shops derive from OpenStreetMap; ODbL requires visible credit.

- Explore map: `© OpenStreetMap contributors` line adjacent to the existing
  Mapbox attribution.
- Profile: an "About the data" row → small screen crediting OSM (with the
  ODbL name) and stating the catalog is community-maintained.
- Strings through the i18n queue like everything else.

### D2. The one rebuild

EAS dev-client build containing `expo-image-picker`, `react-native-view-shot`,
`expo-sharing`. First task of the sprint on the mobile side; everything in B
and the photo button from last sprint depends on it.

### D3. Amharic out the door (process, not code)

`npm run i18n export` → send `i18n-review.csv` to the reviewer from Decision 2
→ `npm run i18n import` when it returns. Target: **168 → 0 awaiting** by
sprint end. Every string this sprint adds goes into the same queue — the
number may tick up before it goes down; that is the system working.

---

## Out of scope, deliberately

- **Trust-level autonomy / moderation devolution** — the flywheel matters at
  50 contributors, not 2 users. Next sprint candidate.
- **Streaks, badge expansion, level-up share cards** — sequels to this
  sprint's foundation, not part of it.
- **SMTP / password reset** — still broken, still deferred; becomes urgent
  the moment strangers create accounts. Tracked, not scheduled.
- **Mapbox offline pack policy** (DESIGN §11.3) — unchanged this sprint.
- **Multi-city, merchant accounts, social graph** — SPEC §5 / DESIGN §12
  exclusions all stand.

## Sequencing

```
Mobile dev:  D2 rebuild ──► B card ──► C2 prompt ──► A passport ──► D1 attribution
Backend dev: C1 PATCH + tests ──► (free: SMTP investigation, next-sprint spike)
Founder:     Decision 1 (handle) · Decision 2 + D3 (Amharic reviewer)
```

A has no dependency on the rebuild — it can start any time or swap earlier if
the rebuild stalls.

## What "worked" means

Quantitative, checked a week after ship: share-sheet opens per stamp earned
(target: it exists and >0), percentage of ceremonies that leave a rating
(target ≥30% — the ask is one tap at the peak moment), Amharic
awaiting-review count (target 0).

Qualitative, the real one: hand the passport screen to someone who drinks
coffee in Addis and watch. If they scroll and hand it back, A failed. If they
ask "how do I get on this," the sprint worked.
