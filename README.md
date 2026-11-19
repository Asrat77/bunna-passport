# Bunna Passport ☕

**The coffee map of Addis Ababa, built by the people drinking it.**

Bunna Passport is a coffee-shop passport for Addis Ababa. You open it in
Telegram, find a café, check in when you're there, and get a permanent stamp
for your first visit. Cups add up, badges and streaks unlock, and the city and
neighbourhood boards show who has been where. Everything is in English and
Amharic.

Try it in Telegram: **[@bunnapassbot](https://t.me/bunnapassbot)**.

> **Status:** closed beta. The public launch covers **Bole** only, with the
> Bole 10 challenge, partner cafés with counter QR stickers, and more
> neighbourhoods once Bole works.

## What's in this repo

| Path | What it is |
|---|---|
| `app/`, `config/`, `db/` | Rails 8.1 app: the JSON API under `/api/v1`, the Telegram bot webhook, and the Hotwire moderator console at `/` |
| `web/` | The **Telegram Mini App** (Vite, React, TypeScript), served by Rails at `/app` |
| `mobile/` | The earlier native Expo / React Native client. Not in active development |
| `script/` | Catalog import, map publishing, backup and restore scripts |
| `docs/` | Product spec, design, API contract and operations runbook |

Key documents:

- [docs/SPEC.md](docs/SPEC.md): what the product is and the rules it follows
- [docs/DESIGN.md](docs/DESIGN.md) and [the Mini App design handoff](docs/telegram-mini-app-design-handoff.md)
- [docs/openapi.yml](docs/openapi.yml): the API contract
- [docs/OPERATIONS.md](docs/OPERATIONS.md): deploying, backups, the bot, alerts and launch tools

## Features

- **Check-ins and stamps.** A check-in near a café gives a first-visit stamp
  and counts a verified cup. Suspicious check-ins go to moderators.
- **Passport, badges and streaks.** Time-boxed challenges like Bole 10 too.
- **Leaderboards** for the whole city and each neighbourhood.
- **Friends.** Invite links, friend activity, reactions to check-ins, and
  share cards for stamps.
- **Community catalog.** People add cafés, fix details, upload photos and write
  reviews. Moderators approve, merge duplicates and settle reports from the
  console or straight from Telegram.
- **The bot** sends nudges, outcomes of contributions, an evening round-up,
  ops alerts and a weekly numbers report, in the person's language.

## Stack

- Ruby 3.4 and Rails 8.1, SQLite for the app and all Solid adapters (Queue,
  Cache, Cable)
- Hotwire and Propshaft for the moderator console
- Vite, React 19, TypeScript, TanStack Query and `@telegram-apps/sdk-react`
  for the Mini App, with MapLibre and a self-hosted PMTiles map of Addis
- Active Storage on Cloudflare R2 in production
- Minitest, Capybara, Vitest, RuboCop, Brakeman and bundler-audit
- Kamal, deploying one container to a single AWS EC2 host with TLS from
  Let's Encrypt, and nightly off-site backups to R2

## Local setup

### Rails API and console

Install SQLite and libvips (`brew install sqlite vips` on macOS), then:

```sh
bin/setup
BUNNA_SEED_SAMPLES=1 bin/rails db:seed
bin/dev
```

Seeds load neighbourhoods and badge definitions. With `BUNNA_SEED_SAMPLES=1`
they also add clearly marked sample records, including a sample account
(`sample@bunna.local` / `development-password`). `db:seed` refuses to run
outside development and test.

To create the founder moderator:

```sh
BUNNA_FOUNDER_EMAIL=founder@example.com \
BUNNA_FOUNDER_HANDLE=founder \
BUNNA_FOUNDER_PASSWORD="local-secret" \
bin/rails bunna:bootstrap_founder
```

The console is at `/`. The API is under `/api/v1` and takes bearer tokens from
email sign-in or Telegram sign-in; it deliberately ignores web cookies.

### Telegram Mini App

The Mini App needs Node 22.12 or newer.

```sh
cd web
cp .env.example .env.local   # optional: map styles, share link
npm install
npm run dev
```

The dev server runs on port 5173 and proxies `/api`, `/cards` and `/telegram`
to Rails on `localhost:3000` (override with `API_ORIGIN`). In a normal browser
you can sign in with email. To open it inside Telegram, expose the dev server
over HTTPS (for example with Tailscale Funnel), point a test bot's Mini App URL
at it, and set `TELEGRAM_BOT_TOKEN` for Rails so Telegram sign-in works.
`bin/rails telegram:poll` answers the bot without a public webhook.

See [Telegram Mini App](docs/OPERATIONS.md#telegram-mini-app) in the
operations doc for the bot, share cards, invites and the map.

## Café catalog

Google Maps is the catalog's source of truth. Cafés are scraped with
[gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper), then
merged into the local catalog:

```sh
script/merge_gosom_catalog storage/local_seed_data/gosom/results.json
```

The merge drops closed and non-coffee places and ones already in the catalog,
places each café in the nearest neighbourhood within 2.5 km, downloads a photo,
and fills in missing hours, price bands and amenities. Cafés too far from every
neighbourhood wait in `gmaps_unplaced.csv` until their neighbourhood exists.
Scraping Google Maps is against Google's terms of service and its listings
carry no licence for reuse; the project accepts that risk.

OpenStreetMap is a secondary research queue: `script/fetch_addis_coffee_osm`
writes candidates for manual review, and data derived from it keeps the OSM
attribution and ODbL notice.

All working data lives under `storage/local_seed_data/`, which Git and Docker
both ignore, so scrapes and photos never get committed or baked into an
image. The importer reads `storage/local_seed_data/shops.csv`:

```csv
slug,name,name_am,neighborhood,landmark,latitude,longitude,photo_paths
```

Optional columns are `city`, `price_band`, `amenities`, `hours` and `status`.
Separate amenities and multiple photo paths with `|`. Photo paths are relative
to the CSV and must stay inside `storage/local_seed_data/`; every row needs at
least one photo. A stable `slug` makes re-imports update a café instead of
duplicating it.

```sh
BUNNA_LOCAL_IMPORTER_EMAIL=founder@example.com \
BUNNA_LOCAL_SHOPS_FILE=storage/local_seed_data/shops.csv \
bin/rails bunna:import_local_shops
```

The import refuses to run in test, staging or production. In production, new
cafés arrive through the console and community contributions.

## Checks

CI runs the tests, RuboCop, Brakeman, bundler-audit and the Mini App build on
every pull request. To run the full set locally:

```sh
bin/rails db:prepare
bin/rails test
bin/rails test:system
bin/rubocop
bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error
bin/bundler-audit
npx --yes @redocly/cli lint --config .redocly.yaml docs/openapi.yml
(cd web && npm test && npm run build)
```

The OpenAPI contract test resolves every local reference and checks that every
public API route is documented with the same method and path. Share card tests
need `librsvg` and the fonts in `vendor/fonts/share_card`.

## Deploying

Production runs with [Kamal](https://kamal-deploy.org) on a single AWS EC2
host. The Docker image builds the Mini App and serves it at `/app`, next to the
API, the console and the bot webhook. Secrets come from `.env.deploy`, which is
never committed. Deploy prerequisites, backups and the restore drill, R2 photo
storage, alerts and the launch tools are all in
[docs/OPERATIONS.md](docs/OPERATIONS.md).

## How the code is organised

Business decisions live on models: contributions approve and reverse
themselves, shops merge in a transaction, check-ins classify themselves and
apply their own counters, reports resolve their trust effects, and users
evaluate their own promotion. Controllers, the console and the bot call those
operations and render the result. The Rails side has no service, policy,
serializer, GraphQL or Redis layers; the Mini App in `web/` is the only
single-page app.

## Contributing

Issues use three kinds of labels: a type (`bug`, `feature`, `chore`,
`documentation`, `security`), an area (`area: mini-app`, `area: api`,
`area: bot`, `area: console`, `area: catalog`, `area: ops`, `area: i18n`)
and a priority (`priority: P0` to `priority: P3`, where P1 means needed for
the Bole launch).
