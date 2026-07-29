# Bunna Passport

Bunna Passport is the Rails V1 backend for a community-maintained coffee-shop
passport in Addis Ababa. People discover bilingual shop listings, check in near
a shop, collect a permanent first-visit stamp, count verified cups, earn badges,
and appear on city or neighborhood leaderboards.

The product definition is [docs/SPEC.md](docs/SPEC.md). The mobile contract is
[docs/openapi.yml](docs/openapi.yml). Phase 1 contains the backend and Hotwire
operations console only; mobile clients, merchant accounts, rewards, social
graphs, trails, and additional cities are intentionally out of scope.

## Stack

- Ruby 3.4 and Rails 8.1
- SQLite for the application and all Solid adapters
- Hotwire and Propshaft for the moderator console
- Active Storage with JPEG, PNG, and WebP variants
- Minitest, Capybara, RuboCop, Brakeman, and bundler-audit
- Kamal with one persistent `storage` volume

## Local setup

Install SQLite and libvips, then run:

```sh
bin/setup
bin/rails db:seed
bin/dev
```

Neighborhoods and badge definitions are idempotent local seeds. `db:seed`
refuses to run outside development and test. To add clearly marked local sample
records, run `BUNNA_SEED_SAMPLES=1 bin/rails db:seed`.

Create the founder moderator without adding an administrator role:

```sh
BUNNA_FOUNDER_EMAIL=founder@example.com \
BUNNA_FOUNDER_HANDLE=founder \
BUNNA_FOUNDER_PASSWORD="local-secret" \
bin/rails bunna:bootstrap_founder
```

The console is at `/`. The mobile API is under `/api/v1`; it accepts bearer
tokens returned by signup or sign-in. Web cookies are deliberately not accepted
by the API.

## Local shop catalog

Working Bole and Addis data belongs under `storage/local_seed_data/`. Both Git
and Docker exclude that directory, so its CSV files, working notes, and photos
cannot be committed or copied into a production image.

Create `storage/local_seed_data/shops.csv` with these required columns:

```csv
slug,name,name_am,neighborhood,landmark,latitude,longitude,photo_paths
```

Optional columns are `city`, `price_band`, `amenities`, and `status`. Separate
amenities and multiple photo paths with `|`. Photo paths are relative to the CSV
file and must resolve inside `storage/local_seed_data/`. Every row requires at
least one photo. A stable `slug` makes repeated imports update the local shop
without creating a duplicate.

Bootstrap a local founder, place the CSV and photos in the ignored directory,
then run:

```sh
BUNNA_LOCAL_IMPORTER_EMAIL=founder@example.com \
BUNNA_LOCAL_SHOPS_FILE=storage/local_seed_data/shops.csv \
bin/rails bunna:import_local_shops
```

The command refuses to run in test, staging, or production.

## Verification

```sh
bin/rails db:prepare
bin/rails test
bin/rails test:system
bin/rubocop
bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error
bin/bundler-audit
npx --yes @redocly/cli lint --config .redocly.yaml docs/openapi.yml
RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile
```

The OpenAPI contract test resolves every local reference and proves that every
public API route is documented with the same method and path.

## Domain boundaries

Business decisions live on models: contributions approve and reverse
themselves, shops merge transactionally, check-ins classify and apply their own
counters, reports resolve trust effects, and users evaluate promotion. The API
and console call those operations and render the result. There are no service,
policy, serializer, GraphQL, Redis, or SPA layers.

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for deployment prerequisites,
founder setup, JSON logging, persistent volumes, and backup/restore drills.
