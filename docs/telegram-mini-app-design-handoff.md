# Bunna Passport Telegram Mini App: design handoff

Build the Telegram Mini App front end from the design canvas below. The canvas is the source of truth for look and layout. `docs/DESIGN.md`, `docs/SPEC.md` and the API contract in `docs/openapi.yml` remain the source of truth for behaviour and rules. Where they disagree, the conflict is listed under [Decisions to confirm](#decisions-to-confirm). Ask before picking.

- **Design canvas:** https://claude.ai/artifact/Dk5qwFqxbcBxnRV5nij72W
- **Technical exploration** (stack, auth, maps, bot, phased plan): https://claude.ai/artifact/NNq3rQzhSyKy66t2uzUgxE
- **Target:** a new `web/` app in this repo. Vite + React + TypeScript, `@telegram-apps/sdk-react`, TanStack Query over the existing API client, plain CSS with custom properties. Leave `mobile/` alone. Port its pure modules as the exploration doc describes.

## How to read the canvas

The canvas is a set of `.dc.html` files under `project/`. Read each one with the Artifact tool (`action: "read"`, `url` above, `path: "project/<file>"`). Both artifacts are private to the owner, so if you can't open them, ask the owner to share them or to paste the files in.

| File | What it is |
|---|---|
| `project/canvas.json` | Layout index. Ignore it except for the artboard list |
| `Welcome.dc.html` | First-run screen (step 1 of 3) |
| `Main.dc.html` | Explore (home) |
| `Shop.dc.html` | Shop detail |
| `CheckIn.dc.html` | Check-in: candidate confirm |
| `Stamp.dc.html` | Stamp ceremony (result: verified, first visit) |
| `Passport.dc.html` | Passport tab |
| `Boards.dc.html` | Leaderboards tab |
| `Studio.dc.html` | Doodle studio (pick or shuffle your avatar) |
| `Doodle.dc.html` | **Component**: generative pencil doodle avatar |
| `InkStamp.dc.html` | **Component**: hero ink stamp |
| `Seal.dc.html` | **Component**: small seal, a port of `mobile/src/design/components/Seal.tsx` |

Treat the files as reference markup, not production code. In the format, `{{name}}` is a value from `renderVals()`. `<sc-for>` and `<sc-if>` are loops and conditionals. `<dc-import name="X" a="b">` mounts component `X` with props. Each file's script holds the logic, including the full doodle generator. Port the logic into typed React components. Don't copy the markup verbatim.

Every artboard is drawn at 390 × 844. The Telegram header ("Close" or "Back", title, "⋯") is drawn only for context. **Don't build it.** Telegram renders it.

## Visual system

### Colour tokens

These are copied from `mobile/src/design/tokens.ts`; don't invent colours. Ship both themes. Pick the theme from `WebApp.colorScheme` and switch live on the `themeChanged` event. The canvas defaults to Dark Roast.

| Token | Light (Modern Ceremony) | Dark (Dark Roast) | Use |
|---|---|---|---|
| `--surface` | `#F6F0E6` | `#17100C` | App background |
| `--raised` | `#FFFBF5` | `#211812` | Cards, dock, inputs |
| `--sunken` | `#EDE2D3` | `#100B08` | Tiles inside cards, empty photo slots, sleepy doodle bg |
| `--ink` | `#22140F` | `#F7EBDD` | Text, selected chip background |
| `--muted` | `#665047` | `#CBB5A2` | Secondary text |
| `--faint` | `#806C61` | `#9E8875` | Placeholders, unearned seal print |
| `--primary` | `#872F1D` | `#F0A05D` | CTAs, active nav, second headline line, clay stamp ink |
| `--on-primary` | `#FFF8ED` | `#25130A` | Text on primary |
| `--primary-soft` | `#F3DCCF` | `#3C2419` | Active nav capsule, icon chips, "New stamp" badge |
| `--accent` | `#D99A24` | `#F3B542` | Cups, progress, awake doodle ring, rating |
| `--accent-soft` | `#F7E8BF` | `#3E2F18` | Cups card, ceremony disc, awake doodle bg |
| `--positive` | `#2F684F` | `#78C69A` | Open now, good GPS |
| `--caution` | `#8D520B` | `#E6AC62` | Closing soon, weak GPS |
| `--border` | `#DED0BF` | `#3C2C22` | 1px borders |
| `--border-strong` | `#BCA995` | `#604638` | Dashed "not yet" outlines |
| `--shadow` | `rgba(52,27,17,.16)` | `rgba(0,0,0,.46)` | Card/dock shadow |

`--glow` is a radial gradient behind the top of Welcome, Stamp ceremony and Doodle studio only. Light uses saffron at 42% opacity; dark uses clay `#872F1D` at 95%. The exact values are in any artboard's `<style>` block.

On launch, call `setHeaderColor`, `setBackgroundColor` and `setBottomBarColor` with `--surface`, so Telegram's chrome blends in.

### Type

- **Latin:** Geist 400/500/600/700.
- **Numbers:** Geist Mono for every count, distance, date and rank (tabular figures, per DESIGN.md §2.3).
- **Ethiopic:** Noto Serif Ethiopic 600/700 for display and inside stamps. Noto Sans Ethiopic for body. Self-host a subset; don't rely on system fonts.
- **Headline:** 32–36px, weight 700, line-height 1.1, letter-spacing −0.03em, on two lines. **The second line is in `--primary`**, for example "Where's your / *first cup?*" This two-tone headline is the signature of every main screen.
- **Section titles:** 18px/600. **Body:** 15–16px. **Meta:** 12–13px. **Eyebrows and labels:** Geist Mono, 11px, uppercase, 0.08em.

### Shape and depth

- **Corner radii:** cards 20–24px, tiles 17px, primary buttons 18px, chips, search and dock fully rounded.
- **Borders:** 1px `--border` on every card.
- **Shadows:** only on the dock, the floating CTA and the passport page (`0 10–14px 28–32px var(--shadow)`).
- **Icons:** outline, stroke 2, 20–22px. Use Material Community Icons where the mobile app does (DESIGN.md §2.4). The canvas hand-draws look-alikes.

## Components

### Navigation dock

On Explore, Passport and Boards it's pinned to the bottom over a fade from `transparent` to `--surface`:
- **Tab pill:** three tabs (Explore, Passport, Boards) inside a raised pill. Labels stay visible. The active tab gets a `--primary-soft` capsule with `--primary` text.
- **Check in button:** sits to the right, 62px tall, in `--primary`. It's a pill with the label on Explore and Passport, and a circle on Boards. It opens Check in with the nearest shop pre-selected.

The dock is hidden on Shop, Check in, Ceremony, Studio and Welcome. Those screens use a full-width primary button instead.

### Primary actions

The canvas shows the main action as a 56px in-page button. In Telegram, use the native **BottomButton** for it:
- Main button: `color` = `--primary`, `text_color` = `--on-primary`.
- Ceremony "Share card": the **SecondaryButton** (Bot API 7.10+).
- Older clients and the plain-website mode: fall back to the in-page button.

### Search pill

52px tall, fully rounded, `--raised`, search icon on the right. The placeholder mixes scripts on purpose ("Search cafés, ቶሞካ, Bole…"). Search goes through the ported `searchKey`, which mirrors `Shop::Name.normalize`.

### Quick tiles

One raised card holding four tiles in a grid: Near me, Map, Jebena, Not yet. Each tile is 88px tall on `--sunken`, with a 34px icon chip above a label. "Not yet" filters to shops you haven't stamped.

### Shop row

A raised card, radius 20, laid out left to right:
- the Seal at 50px (dashed if unstamped)
- the bilingual name, then "neighbourhood · landmark", then a status line: "Not in your passport yet" in primary, or "{n} cups · {level}"
- distance in mono, with open status under it
- a ⋮ menu

### Chips

- **Filter/segment chips:** 40px; selected = `--ink` background with `--surface` text.
- **Tag chips:** 36px, raised, bordered.
- **"Add" chip:** dashed `--border-strong` ("Suggest edit", "Note").

### Stat strip

Three cells in a raised card, separated by 1px dividers. The value is in mono with a 12px muted label under it.

### Seal (small)

This is the existing mobile `Seal.tsx`, unchanged: twin rings, leaf cuts, initials, and the bronze, silver, gold and diamond paints. Unstamped seals have a dashed outline. **Use it only at 60px or smaller:** lists, candidate cards, counters.

### InkStamp (hero stamp)

This is the passport stamp, and the owner cares about it most. Copy the geometry exactly from `InkStamp.dc.html` (viewBox 232):
- **Rings:** r110 (stroke 4), r104 (1.2), r72 (2).
- **Ring text:** "BUNNA PASSPORT · ቡና ፓስፖርት · ADDIS ABABA · " in Geist Mono 12.5, letter-spacing 2.6, on a circular path of r86.
- **Centre:** shop name in Geist 700 at `min(25, 138 / (len × 0.7 + 0.2))` px, y = 102. Under it, the Amharic name and neighbourhood in Noto Serif Ethiopic 700 at 16, y = 125. Then a rule from x 80 to 152 at y = 137, and the date in mono 12 at y = 156.
- **Ink:** `clay` uses `--primary`. Metals are fixed: bronze `#8C5A2B`, silver `#71757A`, gold `#A8811A`, diamond `#2A6F7F`. `none` uses `--border-strong` with dashed rings (`9 7` outer, `4 5` inner).
- **Ink texture:** an SVG filter. Fractal-noise speckle masks the ink at about 70% coverage, then a low-frequency displacement adds wobble. Seed it from the shop name so it's stable.
- **Rotation:** deterministic per stamp, within about ±12°.

Use it at 90px or larger: ceremony (236px on a 268px `--accent-soft` disc), passport page (92–142px), shop header (124px, dashed "YOUR STAMP"), Welcome.

This same SVG should become the server-rendered share card (exploration doc, "The share card moves to the server"). Keep one source of geometry.

### Passport page

A **cream paper page in both themes**. It overrides the colour tokens locally, so clay ink stays `#872F1D` even in dark mode:
- background `#F6F0E6`, faint wavy security lines, header "PIASSA · ፒያሳ" on the left and "PAGE 03" on the right, in mono
- earned stamps pressed at different sizes and angles, overlapping a little, like a real passport
- a "Today" tag on the newest stamp
- unstamped shops as dashed InkStamps with the distance under them ("visible absence", DESIGN.md §2.1)

Build a deterministic slot layout so a page never reshuffles between visits: about 5 slots per page, positions and rotation from a hash of the shop id. Pages follow the neighbourhood chip above them.

### Doodle avatar

Every user gets a generative, pencil-drawn face, and its mood follows their coffee. **This is the personality of the app.**

**Drawing:**
- The algorithm is in `Doodle.dc.html`'s script. Port it 1:1 into a pure TypeScript module: seeded RNG, then head, ears, hair (cap, afro, buzz, bald, beanie or side part), eyes, nose, mouth, glasses, stubble and freckles.
- **The same seed must always draw the same face.** All random draws happen before mood is applied.
- Pencil rendering:
  - graphite `#3A3733` lines with a wobble-and-grain SVG filter
  - hair and open mouths cross-hatched with patterns
  - a faint second pass offset by `translate(.8 −.6) rotate(−1.2)` at 42% opacity
  - outlines that overshoot instead of closing
  - thicker lines below 70px

**Moods:**
- **Sleepy:** droopy lids, eye bags, slanted brows, a yawn or flat mouth, "z z". Shown on a `--sunken` background with a dashed `--border-strong` ring.
- **Awake:** open eyes, a smile or grin, energy marks, and an orange-red (`#C8664A`) colored-pencil blush. Shown on `--accent-soft` with a solid `--accent` ring.

**Rules:**
- Sleepy until the user's **first verified check-in of the local day**, awake after. Proposed reset: 04:00 Africa/Addis_Ababa, to be confirmed.
- **Seed:** the user's chosen `avatar_seed`, defaulting to their Telegram user id.
- **Where it appears:** the Explore greeting (sleepy before coffee), the ceremony (sleepy → awake), the Passport header, the Boards podium and rows, and the Studio.

**Backend additions:**
- Add `avatar_seed` (string, nullable) on users, editable through the profile endpoint.
- Add `had_cup_today` (boolean, server-computed) to passport, profile and leaderboard rows.
- Document both in `docs/openapi.yml`; the contract test fails otherwise.

### Doodle studio

Shows the current seed in both moods side by side. Below that is a 4 × 2 grid of candidate faces. "Shuffle" draws 8 new seeds (`{base}-{n}`). Picking one and pressing "Use this doodle" saves `avatar_seed`.

## Screens

Every screen is 390pt wide, with a 16px side gutter and 14–16px vertical gaps.

1. **Welcome** (first run only; remember in CloudStorage). Top to bottom:
   - a collage of floating stamp "tickets": Kaldi's in silver, Alem Bunna in bronze, Tomoca dashed "Not yet", and a "You, after coffee" doodle card
   - a clay InkStamp on a saffron disc in the centre
   - headline "Every café, / *a new stamp.*"
   - one line of explanation
   - page dots (the active one is an elongated pill)
   - BottomButton "Next"
   - "Signed in with Telegram. No forms, no passwords."

   Steps 2 and 3 aren't designed.
2. **Explore.** Top to bottom:
   - a greeting row: sleepy doodle (tapping it opens the Studio), "Selam, {first_name}", a mood line ("Pre-coffee mode. Let's fix that."), and a bell with an unread dot
   - headline "Where's your / *first cup?*". Once the user has had a cup, change it to something like "Where's the / *next cup?*" (new copy; confirm with the owner)
   - the search pill and the quick tiles
   - "Closest to you" with a "See all" link
   - shop rows sorted by distance
   - the dock

   The list loads first. The map is lazy-loaded behind the "Map" tile (MapLibre, per the exploration doc).
3. **Shop.** Top to bottom:
   - BackButton
   - centred InkStamp: dashed "YOUR STAMP" with a "Not yet" tag if unstamped, the earned stamp otherwise
   - the name in large type, the Amharic name under it, then "neighbourhood · distance · open status"
   - stat strip: price in ብር glyphs, your cups, neighbourhood progress
   - segment chips: Overview, Photos, Reviews, Menu
   - "Getting there" as a landmark-first step list (the passed step is ticked and struck through)
   - a photo with the next one peeking in
   - tag chips plus a dashed "Suggest edit"
   - BottomButton "Check in here"
4. **Check in** (DESIGN.md §5.3, "candidate confirm"). Generate the idempotency key the moment this screen opens. Top to bottom:
   - headline "Two cafés / *within reach.*" (count-driven)
   - radar card: dashed 250 m and half-range rings, a sweep wedge, you in the centre with an accuracy halo, and pins for candidates (out-of-range shops greyed). An accuracy chip in the corner reads "±24 m · good signal" in positive, or the caution state above 100 m.
   - selectable candidate cards (2px primary border when selected) with a "New stamp" badge (primary-soft) or "+1 cup" (accent-soft)
   - optional drink chips (Macchiato, Buna, Spris, and a dashed "Note")
   - a rating pill with 5 cup icons and a photo button
   - BottomButton whose label teaches stamps versus cups: "Stamp it at {shop}" or "+1 cup at {shop}"

   The flow sends only the tap; all extras are optional.
5. **Stamp ceremony** (verified, first visit). Top to bottom:
   - glow background
   - clay InkStamp on an accent-soft disc with the level tag ("Bronze")
   - "Stamped. / *{shop}, {neighbourhood}.*"
   - "Your {n}th stamp. Four more visits turn it silver." (thresholds from `LEVEL_THRESHOLDS`)
   - a completion-ring card: "13 of 47 in Piassa"
   - a doodle card showing sleepy → awake: "You're awake now." (only on the first cup of the day; otherwise hide the card)
   - SecondaryButton "Share card" and BottomButton "Done"

   Motion follows DESIGN.md §6.2. The stamp ink-presses: scale about 1.15 → 1 with overshoot, ink fades in, and one strong haptic (`HapticFeedback.notificationOccurred('success')`). The doodle crossfades from sleepy to awake about 400ms later. It must be actionable within 2.5s and skippable by tapping from 0.8s. Under reduced motion it's a static reveal. A repeat visit gets the compact "+1 cup" tick, not this screen (not designed).
6. **Passport.** Top to bottom:
   - header: awake or sleepy doodle at 64px, name, "@handle · trust title · since …", and a "Doodle" pill that opens the Studio
   - two counters, kept visually separate per DESIGN.md §6.1:
     - **Stamps:** a raised card with a big mono number and a small stack of seals
     - **Cups:** an accent-soft card with the number in `--accent` and the streak as "{n} coffee weeks" with a flame (weekly, forgiving, §6.4)
   - neighbourhood chips with counts ("Piassa 13/47")
   - "Piassa page" with "{n} cafés to go" and a thin accent progress bar
   - the passport page
   - the dock
7. **Boards** (DESIGN.md §6.5). Top to bottom:
   - "This week in / *{place}.*"
   - a scope segment: neighbourhood or All Addis
   - a metric dropdown (Cups)
   - a podium: places 2 / 1 / 3, each with a doodle above a block; first place is taller and in `--primary`
   - ranks 4–6 as rows with doodles and "Had a cup today" / "No coffee yet today"
   - your own row pinned and highlighted in primary-soft, with the rank and the weekly change ("#9 · Up 4 this week")
   - footnote: "Awake doodles have had their first cup today."
   - the dock

   Show handles only, never real names.
8. **Doodle studio.** Top to bottom:
   - BackButton
   - "Meet your / *coffee self.*" with one line of explanation
   - the two mood cards
   - "Or pick another" with Shuffle
   - the 4 × 2 grid
   - BottomButton "Use this doodle"
   - "Friends see it on boards and on your share cards."

## Accessibility

- **Touch targets:** 48px minimum. DESIGN.md is Android-first; some canvas chips are drawn at 40–44px, so enlarge them.
- **Contrast:** text must reach 4.5:1 in both themes. Check it with tooling, especially `--faint` and the light accent text.
- **Colour is never the only signal:** dashed versus solid outlines and the "Not yet", "New stamp" and "+1 cup" labels already carry it.
- **Labels:** every icon-only button needs an accessible label. Doodles get `aria-label` "Your doodle, sleepy before coffee" / "…awake after coffee". Stamps get the shop, level and date.
- **Amharic:** line-height at least 1.6 wherever Amharic can appear. Test all screens in `am` with the existing `i18n/strings.ts`. Many strings on the canvas are new and need Amharic translations reviewed through `i18n-review.csv`.

## Content on the canvas is placeholder

All people (Meklit, @dawit…), counts, distances, dates, landmarks and shops other than real catalog entries are sample data. Pull everything from the API. Don't hard-code any of it.

## Not designed yet

- Welcome steps 2 and 3
- the map view
- check-in locating state and every rejection state (too far, weak GPS, cooldown, daily cap)
- offline / queued check-ins
- the repeat-visit "+1 cup" tick
- badges, plus the badge-award card that slides in after the ceremony
- profile and settings: language switch, notification opt-in (`requestWriteAccess` after the first stamp), add to home screen. The first canvas draft had these; this one doesn't.
- contribution flows: add shop, duplicate check, suggest edit, photo, report
- Telegram Desktop/Web, where check-in needs a phone
- empty and cold states (signed-in user with no stamps yet)

Build these from the same components, or ask for designs first.

## Decisions to confirm

1. **Tabs:** DESIGN.md §3 has 4 tabs (Explore, Passport, Boards, Profile) and a dock with the Check in control in the centre. The canvas has 3 tabs with Check in on the right, and Profile folded into the Passport header plus the Studio. Pick one.
2. **Default theme:** the canvas defaults to Dark Roast; DESIGN.md defaults to light. Proposal: follow Telegram's `colorScheme`.
3. **Doodle privacy:** "had a cup today" on the boards tells friends when someone has been to a café. Consider an opt-out, and never expose the time or the shop.
4. **Doodle reset time:** 04:00 Addis time is proposed.
5. **Doodles on server-rendered share cards:** needs the generator on the server too, either a Node render step or a Ruby port. Alternatively, leave doodles off share cards for v1.

## Suggested build order

1. Tokens and theme switch, fonts, Telegram chrome colours, BottomButton wiring.
2. Pure modules: the doodle generator, InkStamp and Seal as React SVG components, with unit tests that the same seed gives the same paths.
3. Explore → Shop → Check in → Stamp ceremony on the real API: the core loop, phase 1 in the exploration doc.
4. Passport with the page layout, then Boards, then the Studio with the `avatar_seed` and `had_cup_today` API additions and their OpenAPI entries.
5. The not-yet-designed states, using the components above.

**Done** means a real phone opens the bot, lands signed in on Explore with a sleepy doodle, checks in at a shop within 250 m, sees the ink stamp ceremony and the doodle wake up, and finds the new stamp on the Passport page, in both themes and both languages.
