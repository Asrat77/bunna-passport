# Bunna Passport operations

This document prepares the V1 backend for a single-host Kamal deployment. It
does not authorize or perform a production deployment.

## Persistent data

The Kamal configuration mounts `bunna_passport_storage` at `/rails/storage`.
That one volume contains the primary SQLite database, Solid Queue, Solid Cache,
Solid Cable, and any Active Storage files stored before the move to R2 (see
Photo storage below). The `/up` endpoint is the container
health check.

Required deployment values:

- `BUNNA_DEPLOY_IMAGE`
- `BUNNA_DEPLOY_HOST`
- `BUNNA_DEPLOY_SSH_USER`
- `BUNNA_REGISTRY_SERVER`
- `BUNNA_REGISTRY_USERNAME`
- `KAMAL_REGISTRY_PASSWORD`
- `RAILS_MASTER_KEY`
- `BUNNA_APP_HOST`

Do not run `bin/kamal deploy` until the host, registry, DNS, TLS termination,
and backup destination have been chosen explicitly.

## Chosen infrastructure

The app shares one AWS EC2 instance with battle-arena, another of the
operator's projects. That instance idles at well under 1% CPU, so sharing it
costs about $1 a month (a larger disk) instead of about $22 for a second
server. kamal-proxy on the host terminates HTTPS for both apps by host name.

| Value | Setting |
| --- | --- |
| Instance | `i-04312149bfbc789ad` (since 2026-11-10), `t3.small`, 2 vCPU, 2 GB plus 2 GB swap |
| Region | `eu-west-1` (Ireland) |
| Image | Ubuntu 24.04 LTS |
| Address | Elastic IP `34.252.38.138` |
| Host | `bunna.34.252.38.138.sslip.io` |
| Registry | `ghcr.io/asrat77/bunna-passport` |
| Provisioning | Terraform in the battle-arena repo, `deploy/terraform` |

The previous Azure VM (`southafricanorth`) stopped on 2026-10-22 when the
Azure for Students credit ran out. Ireland is farther from Addis, but Cape
Town (`af-south-1`) is an opt-in region with higher prices.

SQLite requires a real local filesystem. The Docker volume sits on the
instance's own disk for that reason, which is also why this deployment is a
virtual machine rather than a container service backed by network storage.
The disk is deleted if the instance is terminated, so the off-host backup
below is what protects the data.

This has happened once. On 2026-11-10 at 06:01 UTC a `terraform apply` in the
battle-arena repo, meant only to change the SSH address, replaced the instance
because Canonical had published a newer Ubuntu image and the AMI was not
pinned. The disk went with it. Production was restored from that night's
00:15 UTC off-host backup (11 users, 1,633 shops, 21 check-ins; nothing newer
was lost) onto the new instance with `kamal setup`, after copying the
databases into a fresh `bunna_passport_storage` volume. battle-arena PR #88
makes the Terraform ignore AMI changes and adds `prevent_destroy`; until it is
merged, and even after, read every plan before applying and stop if it says
"must be replaced".

On a rebuilt host the backup job has to be installed again: `age` and
`rclone`, the `r2backup` rclone remote, `/etc/bunna-backup.env`,
`/usr/local/bin/bunna-backup-offsite` and the 00:15 UTC cron (see Off-host
backup).

Deployment values live in the gitignored `.env.deploy`. The registry password is
never stored there:

```sh
set -a; source .env.deploy; set +a
export KAMAL_REGISTRY_PASSWORD=$(gh auth token)   # needs write:packages
bin/kamal deploy
```

The builder is remote and points at the deployment host, so images build
natively on amd64 instead of under emulation. Kamal builds from a git clone of
`HEAD`, so commit any change that must appear in the image before deploying.

A remote builder still runs `docker buildx` locally against a remote endpoint,
so the push reads the *workstation's* registry credentials rather than the
host's. A local Docker daemon and a local registry login are both required, and
logging in on the deployment host alone is not enough:

```sh
gh auth token | docker login ghcr.io -u <username> --password-stdin
```

Pushing to `ghcr.io` needs a token with `write:packages`. Without the local
login the build succeeds and the push fails with `denied`.

## Database initialization

Prepare the schema, then explicitly install only the reference records required
by the application:

```sh
bin/rails db:prepare
bin/rails bunna:bootstrap_reference_data
```

Production database preparation has automatic seeds disabled, and `db:seed`
aborts outside development and test. The reference bootstrap is idempotent and
creates only the Addis neighborhood catalog and badge definitions. It creates
no users, shops, check-ins, contributions, or photos.

Never copy `storage/local_seed_data/` to a server or production volume. The
directory is excluded from both Git and Docker, and the local import command
also refuses to run outside development.

## Founder bootstrap

Run this once against the target environment:

```sh
BUNNA_FOUNDER_EMAIL=founder@example.com \
BUNNA_FOUNDER_HANDLE=founder \
BUNNA_FOUNDER_DISPLAY_NAME="Founder" \
BUNNA_FOUNDER_PASSWORD="use-a-password-manager" \
bin/rails bunna:bootstrap_founder
```

This creates or promotes the user to the existing `moderator` trust level. It
does not create a separate administrator role.

## Backup

Run the backup command on a host that can read the mounted `storage` directory:

```sh
script/backup /absolute/path/to/off-host-backups
```

The command uses SQLite's online backup operation for each production database,
archives Active Storage, writes checksums, and prints the new backup directory.
Copy that directory off the application host and test restores regularly.

## Off-host backup

`script/backup` leaves its output beside the database, which survives nothing
that matters. `script/backup_offsite` takes that backup, encrypts it, and sends
it out of the cloud account running the application.

The destination is deliberately outside AWS. The account runs on a fixed
credit: if it runs out, a backup living in the same account disappears on the
same day as the machine it was protecting. The same thing happened to the
earlier Azure deployment.

Installed on the application host as `/usr/local/bin/bunna-backup-offsite`,
scheduled nightly at 00:15 UTC, and configured from `/etc/bunna-backup.env`.
Retention keeps every run for 14 days, then Mondays only for 12 weeks — about
two dozen copies.

Two values have to be supplied before the schedule does anything:

1. **A destination.** Create a bucket with any S3-compatible provider outside
   AWS — Cloudflare R2 and Backblaze B2 both have free tiers far larger than
   this data — then configure it on the host with `rclone config` and set
   `BUNNA_BACKUP_REMOTE` to `remote:bucket`.

2. **A recipient key.** `age` accepts SSH keys, so `BUNNA_BACKUP_RECIPIENT` is
   currently the operator's `ssh-ed25519` public key — the same one that opens
   the server. Nothing new to generate, and the private half already lives only
   on the operator's machine.

   The server encrypts to the public key and cannot read its own backups, which
   is the point: whoever holds the bucket never holds the email addresses,
   password digests, or the record of where people drink coffee.

   Restore with the matching private key:

   ```sh
   age -d -i ~/.ssh/id_ed25519 bunna-passport-<stamp>.tar.age | tar -xz
   ```

   This ties the backups to that SSH key. Rotating it without re-encrypting
   makes every existing archive unreadable, so swap in a dedicated key when the
   SSH key is due to change:

   ```sh
   age-keygen -o bunna-backup.key   # private half to a password manager
   age-keygen -y bunna-backup.key   # public half into BUNNA_BACKUP_RECIPIENT
   ```

   Either way, losing the private key loses every backup. There is no recovery
   path, by design.

Check the schedule with `crontab -l` and the last run in
`/var/log/bunna/backup.log`.

### Backing up a laptop

When the data worth keeping is on a development machine (the scraped catalog,
its photos, the development database), `script/backup_local` does the same job
from there: it snapshots `development*` databases with `script/backup`,
encrypts the archive to `BUNNA_BACKUP_RECIPIENT`, and uploads it to
`$BUNNA_BACKUP_REMOTE/local/`, apart from the server's nightly archives. It
needs `sqlite3`, `age` and `rclone` (`brew install sqlite age rclone`) and an
rclone remote for the backup bucket with a token that can write to it.

Restore by decrypting and unpacking the archive, then:

```sh
BUNNA_BACKUP_DATABASES=development script/restore /absolute/path/to/bunna-passport-<stamp> --confirm-overwrite
```

## Photo storage (Cloudflare R2)

Production stores Active Storage files (shop photos, check-in photos, avatars)
in a Cloudflare R2 bucket through the S3 API, not on the storage volume. It is
a separate bucket from the backups, with its own token: the app should never be
able to read or delete the backups, and the backup job should not see photos.

Blobs record which service holds them, so files uploaded to `local` before the
switch keep being served from the volume. New uploads go to R2.

To move those older files across, run `bin/rails bunna:move_storage FROM=local
TO=r2` (add `DRY_RUN=1` to count first). It copies each file, then points its
blob at R2, and leaves the local copy behind, so it can be rerun safely and a
move is undone by setting `service_name` back. In production run it through
`bin/kamal app exec`.

One-time setup in the Cloudflare dashboard (same account as the backup bucket):

1. **R2 Object Storage → Create bucket.** Name it `bunna-photos`. Location
   automatic, Standard storage class. Leave public access off: the app hands
   out short-lived signed URLs.
2. **R2 Object Storage → Manage API tokens → Create API token.** Permission
   *Object Read & Write*, applied to `bunna-photos` only, no expiry (or one you
   will remember to rotate). Copy the Access Key ID and Secret Access Key; the
   secret is shown once.
3. Note the **Account ID** (32 hex characters) from the R2 overview page or the
   dashboard URL. It is not the token value: R2 only needs the key pair.

Then add these to `.kamal/secrets` (gitignored) so Kamal passes them to the
container:

```sh
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET=bunna-photos
```

A deploy without them fails at the secrets step rather than starting an app
that cannot store photos. To deploy before R2 is ready, set
`ACTIVE_STORAGE_SERVICE=local` in the deploy env and drop the four `R2_*`
entries from `config/deploy.yml`.

Development stores new uploads on local disk. To try R2 from a laptop, put
the four `R2_*` variables in `.env` (gitignored; development loads it
automatically) and set `ACTIVE_STORAGE_SERVICE=r2` there too. Once any blobs
have been moved to R2, development needs those variables to show them.

`script/backup` archives only the local volume, so photos in R2 are not in the
nightly backup. Scraped catalog photos can be re-imported; user uploads cannot,
so revisit this before photo uploads open to the public.

## Restore drill

1. Stop web and job processes so nothing writes to `storage`.
2. Take a fresh backup of the current state.
3. Restore only from a verified, explicit backup directory:

```sh
script/restore /absolute/path/to/bunna-passport-YYYYMMDDTHHMMSSZ --confirm-overwrite
bin/rails db:prepare
```

4. Start the job process and web process.
5. Check `/up`, founder login, a catalog read, and Solid Queue processing.

The restore command overwrites production database files and Active Storage.
The confirmation flag is intentionally required.

## Operational checks

- Inspect JSON logs by `request_id`.
- `/up`, unhandled errors and disk space alert as described under Alerts.
- Watch flagged-to-verified check-in ratio, moderation queue age, stale shop
  hours, and backup age.
- Run `RefreshLeaderboardsJob.perform_now("week")` as a post-deploy job smoke
  check; it is safe and idempotent.

## Alerts

Production reports its own problems to Telegram through the bot
(`Ops::Alert`). Three things raise an alert:

- an unhandled exception in a request, or in a job once its retries are
  used up (`Ops::ErrorSubscriber`, subscribed in production only);
- a crash in the Mini App, which posts to `POST /api/v1/client_errors`
  (a render crash also shows a "Reopen" screen instead of a blank app);
- the storage volume passing 85% full, checked hourly by
  `CheckHostHealthJob`.

Alerts go to the Telegram ids in `BUNNA_ALERT_CHAT_IDS` (comma separated) when
it is set at deploy time, and otherwise to every moderator account that has
started the bot. Each distinct error is announced at most once an hour; the
disk warning once every 12 hours. Nothing is sent when `TELEGRAM_BOT_TOKEN` is
unset.

The app cannot report that it is down. For that, point a free external monitor
(UptimeRobot, Better Stack or healthchecks.io) at
`https://<BUNNA_APP_HOST>/up` every 5 minutes, alerting by email or Telegram.

## Moderation digest

Every morning at 09:00 Addis, `SendModerationDigestJob` sends the same chats
as the alerts a summary of what is waiting in the console: pending new cafés,
café edits and photos, pending reports and flagged check-ins. Nothing is sent
when every queue is empty. The oldest five easy cases follow as their own
messages with buttons: flagged check-ins (Verify / Reject) and suggested edits
to an existing café (Approve / Reject, which records "Rejected by a moderator
in Telegram." as the reason). New cafés, photos and reports need the map, the
image or more context, so they only appear as counts.

Only a tap from a moderator account counts, so a non-moderator id listed in
`BUNNA_ALERT_CHAT_IDS` sees the buttons but cannot use them. After a tap the
message is redrawn with the outcome and the buttons removed; an item someone
already settled, in Telegram or the console, is left alone. Links to the
console appear when `PUBLIC_BASE_URL` is HTTPS. To send one now:
`bin/kamal app exec 'bin/rails runner "SendModerationDigestJob.perform_now"'`.

## Launch tools

**Where signups come from.** Every way into the Mini App can carry a source
tag, kept on the account when it is made (`users.signup_source`, see
`LaunchLink`). Friend invites count as `invite`, the button on a shared stamp
card as `card`, a café's counter sticker as `qr-<shop id>`, and anything else
as the tag you give the link. The Monday report says where last week's new
people came from, stickers by café name. To make a tagged link for a post,
use the console's Stickers page or
`bin/kamal app exec 'bin/rails bunna:link SOURCE=ig-addiscoffee'`.

**Counter stickers.** Console → Stickers: pick the neighborhood and the
partner cafés, then print at 100% on A4 (six 90 mm stickers a page). Each QR
opens that café's page in the Mini App. A café's console page has a "Print QR
sticker" button for one at a time. The links point at the bot, so
`TELEGRAM_BOT_USERNAME` (and `TELEGRAM_MINI_APP_NAME`) must be the final ones
before printing.

**Bole 10.** A time-boxed badge for visiting every café on a list between two
dates; there are no trails. Once the ten cafés are agreed:

```sh
bin/kamal app exec 'bin/rails bunna:challenge SHOPS=slug-1,slug-2,... STARTS=2026-12-08 ENDS=2026-12-29'
```

Dates are Addis time and `ENDS` is the first day after it closes. Running it
again changes the list or dates. The badge stays hidden until `STARTS`, sits
at the front of the Passport tab while it runs, with the cafés still to visit,
and afterwards stays only on the shelves of people who earned it.

**First-stamp funnel.** The Monday report also says how many of the people who
joined the week before last had a stamp within seven days of signing up, and
how last week's newcomers are doing so far.

## Telegram Mini App

The Mini App lives in `web/` and signs people in with Telegram's signed
`initData` through `POST /api/v1/telegram_sessions`. The server checks the
signature with the bot's token, so the API container needs
`TELEGRAM_BOT_TOKEN` (listed under `env.secret` in `config/deploy.yml`, and
supplied the same way as the other Kamal secrets). Without it every Telegram
sign-in answers `401 invalid_init_data`; email sign-in keeps working.

The Docker image builds `web/` and serves it at `/app` on the API host:
`MiniAppsController` returns the page with `no-cache` so Telegram opens each
new release, and the fingerprinted files sit under `public/app/assets`. Point
the bot's Mini App URL in BotFather at `https://<host>/app`. The public
`VITE_` settings come from `.env.deploy` as build arguments.

The app calls `/api/v1` on its own origin unless `VITE_API_BASE_URL` is set
at build time. A front end on another origin, such as the Appwrite
site, needs that origin in `CORS_ORIGINS` (comma-separated, default
`https://bunna-passport.appwrite.network`) and `VITE_API_BASE_URL` set to the
API's full `/api/v1` URL in its build. CORS covers `/api/*` only and never
allows cookies; the API uses bearer tokens.

The bot token belongs to the API only. Never put it in a `VITE_` variable:
those are compiled into the public JavaScript.

### Share cards

`POST /api/v1/check_ins/:check_in_id/share_cards` renders a stamp's share
cards (a 1080 x 1350 post and a 1080 x 1920 story) with `rsvg-convert` and
stores them through Active Storage, so on R2 in production. They are served
publicly at `/cards/:token.png`, because Telegram fetches them without signing
in. The Docker image installs `librsvg2-bin` and the fonts in
`vendor/fonts/share_card`; to render locally, install the same (`brew install
librsvg` on macOS, then copy the fonts into `~/Library/Fonts`) and run
`bin/rails bunna:sample_share_cards`, which writes both sizes to
`tmp/share_cards`. Set `TELEGRAM_BOT_USERNAME` to print `t.me/<bot>` in the
card footer and add a button to it on shared messages.
`POST /api/v1/shops/:shop_id/share_cards` does the same for the visit that
earned the caller's stamp at a shop.

For Telegram accounts the API also saves a prepared photo message with the
Bot API (`savePreparedInlineMessage`, using `TELEGRAM_BOT_TOKEN`) and returns
its id, which the Mini App passes to `shareMessage` so the card itself lands
in the chat. If that call fails the cards are still returned and the app
falls back to sharing the card's link.

Card URLs must be reachable by Telegram's servers over HTTPS. They are built
from the request's host unless `PUBLIC_BASE_URL` is set (for example
`https://mac.tail498795.ts.net`), which is needed whenever Rails sits behind a
proxy that rewrites the host, such as the Vite dev server. The dev server
proxies `/cards` to Rails as well as `/api`.

### Friends and invite links

Everyone has an invite link (`GET /api/v1/invite`). With
`TELEGRAM_BOT_USERNAME` set it is a Mini App deep link,
`https://t.me/<bot>?startapp=invite_<token>`, which needs the bot's **Main
Mini App** turned on in BotFather (Bot Settings → Configure Mini App). To use
a named app from `/newapp` instead, set `TELEGRAM_MINI_APP_NAME` to its short
name and links become `t.me/<bot>/<app>?startapp=…`. Without a bot username
the link is `PUBLIC_BASE_URL/?invite=<token>` (or the request's host), which
the web app reads the same way, so invites can be tested in a browser.

Shared cards carry the sender's invite: it is the button on the prepared
Telegram message and is appended to the text when the app falls back to a
plain link share. Accepting a link makes both people friends at once; either
can remove the other, and `DELETE /api/v1/invite` retires a link that spread
too far. The friends feed shows friends' verified visits from the last 30
days with the coffee day only, never the time, and skips anyone who turned
off "Show my café visits to friends".

Local development, with Rails on port 3000:

```sh
cd web
npm install
npm run dev        # proxies /api to API_ORIGIN, default http://localhost:3000
```

Telegram only opens HTTPS URLs, so point one tunnel at port 5173 and set it as
the bot's Mini App URL in BotFather. The proxy carries the API through the
same tunnel. Outside Telegram the same page works as a plain website with
email sign-in.

Build-time settings (`web/.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API root when it isn't same-origin `/api/v1` |
| `VITE_MAP_STYLE_URL` | MapLibre style for the self-hosted Addis PMTiles; unset hides the map |
| `VITE_MAP_STYLE_DARK_URL` | The dark style, used when the phone is in dark mode; falls back to the light one |

People reading the app in Amharic get the `-am` twin of whichever style
applies (`style-light-am.json` beside `style-light.json`), so there is no
separate setting for it.
| `VITE_SHARE_URL` | Link a shared stamp points to, such as `https://t.me/<bot>/<app>` |

Checks before a release: `npm run build` (type-checks, then bundles) and
`npm test` in `web/`.

### The bot

The bot answers in private chats only:

- `/start` (and anything else typed) creates the account if needed and replies
  with a welcome and an **Open Bunna Passport** button. A `/start` payload is
  ignored; invite links open the Mini App directly with `startapp`.
- `/nudges_off` and `/nudges_on` switch the daily nudge. The Mini App's
  Passport settings has the same switch inside Telegram (`daily_nudges` on
  the profile).
- Every afternoon at 15:00 Addis (`send_daily_nudges` in
  `config/recurring.yml`, so production only), anyone who started the bot,
  kept nudges on and hasn't had a cup this coffee day (from 04:00 Addis) gets
  one "Had a cup today?" message with **Check in** and **Stop daily nudges**
  buttons. `users.last_nudged_at` keeps it to one a day.
- A counted visit that presses a new stamp or takes one to silver, gold or
  diamond sends a message, including when a moderator verifies a flagged
  visit later.

A bot may only write to someone who started it, so `users.telegram_chat_started_at`
is set on `/start` and cleared when Telegram reports the bot blocked (a 403
or a `my_chat_member` update). Messages are English for now.

The buttons open `TELEGRAM_MINI_APP_URL`, or `PUBLIC_BASE_URL` when that is
unset. Telegram only accepts HTTPS there; without one the bot still talks but
shows no button.

**Production** takes updates on `POST /telegram/webhook`, which only accepts
requests carrying `TELEGRAM_WEBHOOK_SECRET` in Telegram's secret header (set
it in `.kamal/secrets`; letters, digits, `_` and `-`). After a deploy, point
the bot there once:

```sh
bin/kamal app exec 'bin/rails bunna:telegram:set_webhook URL=https://<host>/telegram/webhook'
```

That also registers the command list and the chat's menu button.

**Development** without a public URL: run long polling next to the server. It
removes any webhook first, since Telegram allows only one of the two.

```sh
TELEGRAM_BOT_TOKEN=... PUBLIC_BASE_URL=https://mac.tail498795.ts.net bin/rails server
TELEGRAM_BOT_TOKEN=... PUBLIC_BASE_URL=https://mac.tail498795.ts.net bin/rails bunna:telegram:poll
```

Stamp messages go out from the server process, so both need the token. To
send the nudge without waiting for the afternoon:
`bin/rails bunna:telegram:nudge HANDLE=<you> FORCE=1` (it still skips anyone
who has had a cup today). A webhook through the tunnel works too, since the
Vite dev server proxies `/telegram`: set `TELEGRAM_WEBHOOK_SECRET` on the
server and run `bin/rails bunna:telegram:set_webhook`.

### Addis map

The map is static files in a public R2 bucket, `bunna-map`, so it needs no
app server. The browser reads one `.pmtiles` file with range requests, plus
a style and the fonts and sprites it uses. There are four styles, light and
dark in English and in Amharic. English labels carry the fidel name on a
second line where OSM has one; Amharic labels lead with fidel and carry the
English name underneath, and fall back to English where OSM has no Amharic. The tiles are an Addis cut of
the Protomaps OpenStreetMap build; the attribution button credits OSM, as its
licence requires.

One-time setup in the Cloudflare dashboard (same account as `bunna-photos`):

1. **R2 Object Storage → Create bucket** `bunna-map`.
2. **Bucket → Settings → Public access → R2.dev subdomain → Allow.** The
   `https://pub-….r2.dev` URL it shows is `MAP_PUBLIC_URL`. Cloudflare
   rate-limits r2.dev (throttling starts around hundreds of requests a second)
   and doesn't cache it; move to a custom domain (below) once there's real
   traffic.
3. **Bucket → Settings → CORS policy:**

   ```json
   [{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["range","if-match"],"ExposeHeaders":["etag"],"MaxAgeSeconds":3000}]
   ```

4. **Manage API tokens → Create API token,** Object Read & Write, scoped to
   `bunna-map` only. It is used only to upload from a laptop; never put it in
   `web/.env`, whose `VITE_` values end up in the public page.

To publish or refresh the map (`brew install pmtiles rclone`):

```sh
export MAP_R2_ENDPOINT=https://<account id>.r2.cloudflarestorage.com
export MAP_R2_BUCKET=bunna-map
export MAP_R2_ACCESS_KEY_ID=...
export MAP_R2_SECRET_ACCESS_KEY=...
export MAP_PUBLIC_URL=https://pub-<id>.r2.dev
script/publish_addis_map
```

It uploads `addis-<build date>.pmtiles`, the fonts and sprites, then the four
styles pointing at the new tiles, and prints the two `VITE_MAP_STYLE*` lines
for `web/.env`. Those URLs stay the same across refreshes, so only the first
run needs a rebuild. Delete older `addis-*.pmtiles` a day after a refresh.
Re-cut every few months. The colours live in `web/scripts/map-style.mjs`;
after changing them, `MAP_STYLES_ONLY=addis-<date>.pmtiles script/publish_addis_map`
uploads just the styles for the tiles already in the bucket.

#### Custom domain for the map

A custom domain puts the map behind Cloudflare's cache and out of r2.dev's
rate limit. The domain has to be a zone on the same Cloudflare account
(nameservers pointed at Cloudflare).

1. **R2 → `bunna-map` → Settings → Custom Domains → Connect Domain,** for
   example `map.<your domain>`. Cloudflare adds the DNS record and
   certificate; wait until the domain shows **Active**. The bucket's CORS
   policy applies to it as is.
2. Rewrite the styles so their tiles, fonts and sprites come from the new
   host (the tiles and fonts themselves don't move):

   ```sh
   MAP_PUBLIC_URL=https://map.<your domain> \
   MAP_STYLES_ONLY=addis-<date>.pmtiles script/publish_addis_map
   ```

3. Set the printed `VITE_MAP_STYLE_URL` and `VITE_MAP_STYLE_DARK_URL` in
   `web/.env`, rebuild and redeploy `web/dist`.
4. Once nobody runs an older build (a day or two), turn the r2.dev subdomain
   off under **Public access**. Until then old builds keep working, because
   r2.dev serves the same files.
