# Bunna Passport — mobile client

Expo / React Native client for the Rails V1 API. Android-first: units are dp,
the interaction baseline is Material 3, and every screen is designed for a
mid-range Android phone on expensive, patchy data.

- Product source of truth: [`../docs/SPEC.md`](../docs/SPEC.md)
- Design system and UX: [`../docs/DESIGN.md`](../docs/DESIGN.md)
- API contract: [`../docs/openapi.yml`](../docs/openapi.yml)

## Requirements

- Node 20.19.4+ (React Native 0.86 warns below this)
- JDK 17 and the Android SDK
- A **development build** — Expo Go cannot load this app, because MapLibre,
  SQLite and SecureStore are native modules

## Running it

The Rails API must be running first:

```bash
cd .. && bin/rails server
```

Then build and install a dev client on a connected device or emulator:

```bash
npx expo run:android
```

`app.json` points `extra.apiBaseUrl` at `http://10.0.2.2:3000/api/v1`, which is
how the Android emulator reaches the host machine's localhost. On a physical
device, change it to your machine's LAN address.

## Verifying

```bash
npx tsc --noEmit
```

```bash
npx expo export --platform android
```

The export is the cheapest end-to-end check: it resolves every import and
bundles the app without needing a device.

## What is built

The first vertical slice, proving the whole architecture end to end:

- App shell, dual-script theming, and the design tokens from `DESIGN.md`
- Typed API client over the OpenAPI contract, with structured error handling
- SQLite catalog cache with `updated_since` sync, ETags, and tombstones
- Email sign-up / sign-in with the bearer token in SecureStore
- Explore: MapLibre map with seal pins, list view, bilingual search, filters
- Shop detail with landmark-first directions and opt-in photo loading
- Idempotent GPS check-in with all four rejection codes, an offline queue, and
  the stamp ceremony

## Notable constraints encoded here

**Search normalization is mirrored, not reimplemented.**
`src/db/searchKey.ts` is a direct port of `Shop::Name.normalize`
(`../app/models/shop/name.rb`) so offline search collapses `Tomoca`,
`To.Mo.Ca` and `ቶሞካ` the same way the server does. Change one, change both.

**The server owns check-in verdicts.** `ACCURACY_LIMIT_METERS` and
`DISTANCE_LIMIT_METERS` in `src/location/useLocation.ts` exist only to warn the
user before a doomed round-trip. The client never decides the outcome, and
never learns that a check-in was flagged.

**Fonts are imported per weight.** Importing from a `@expo-google-fonts`
package root pulls every weight and italic into the APK. Ethiopic faces are
bundled rather than assumed, because Android's system coverage of fidel is
inconsistent.

**A keystroke must not cost a network request.** `useCatalog` syncs once per
mount; searching and filtering read only from SQLite.

## Open decisions

Tracked in `../docs/DESIGN.md` §11. The one that affects code today:

**Production map tiles are unresolved.** `src/features/explore/mapStyle.ts`
uses OpenStreetMap's public raster tiles, which cover Addis well enough to
build against but whose usage policy forbids shipping. A production tile
source (self-hosted, or a vector provider) has to be chosen before release,
and the warm map styling in `DESIGN.md` §2.2 can only be fully realised once
it is.

Also unshipped from the slice: contribution flows (add shop, suggest edit,
photos, reports), badges, and the duplicate-candidate interstitial.
