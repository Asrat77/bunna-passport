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

The single host is an Azure virtual machine. `southafricanorth` is the closest
Azure region to Addis Ababa, so it is the latency choice for an Addis-first
product.

| Value | Setting |
| --- | --- |
| Resource group | `bunna-passport-rg` |
| Virtual machine | `bunna-passport-vm`, `Standard_B2als_v2`, 2 vCPU, 4 GB |
| Image | Ubuntu 24.04 LTS, 64 GB StandardSSD |
| Host | `bunna-passport.southafricanorth.cloudapp.azure.com` |
| Registry | `ghcr.io/asrat77/bunna-passport` |

`Standard_B2s` does not exist in `southafricanorth`; only the v2 B-series is
offered there. Inbound 22, 80, and 443 are open on `bunna-passport-vmNSG`.

SQLite requires a real local filesystem. The Docker volume sits on the virtual
machine's own disk for that reason, which is also why this deployment is a
virtual machine rather than Azure Container Apps backed by Azure Files.

Deployment values live in the gitignored `.env.deploy`. The registry password is
never stored there:

```sh
set -a; source .env.deploy; set +a
export KAMAL_REGISTRY_PASSWORD=<github token with write:packages>
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

The destination is deliberately not Azure. This subscription is Azure for
Students: if the credit runs out, a backup living in the same subscription
disappears on the same day as the machine it was protecting.

Installed on the application host as `/usr/local/bin/bunna-backup-offsite`,
scheduled nightly at 00:15 UTC, and configured from `/etc/bunna-backup.env`.
Retention keeps every run for 14 days, then Mondays only for 12 weeks — about
two dozen copies.

Two values have to be supplied before the schedule does anything:

1. **A destination.** Create a bucket with any S3-compatible provider outside
   Azure — Cloudflare R2 and Backblaze B2 both have free tiers far larger than
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
- Alert on `/up` failures and growing Solid Queue failures.
- Watch flagged-to-verified check-in ratio, moderation queue age, stale shop
  hours, and backup age.
- Run `RefreshLeaderboardsJob.perform_now("week")` as a post-deploy job smoke
  check; it is safe and idempotent.

## Telegram Mini App

The Mini App lives in `web/` and signs people in with Telegram's signed
`initData` through `POST /api/v1/telegram_sessions`. The server checks the
signature with the bot's token, so the API container needs
`TELEGRAM_BOT_TOKEN` (listed under `env.secret` in `config/deploy.yml`, and
supplied the same way as the other Kamal secrets). Without it every Telegram
sign-in answers `401 invalid_init_data`; email sign-in keeps working.

The app calls `/api/v1` on its own origin unless `VITE_API_BASE_URL` is set
at build time. Serve the built `web/dist` from the same host as the API (or
behind the same proxy). A different origin would need CORS, which the API does
not enable.

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
| `VITE_SHARE_URL` | Link a shared stamp points to, such as `https://t.me/<bot>/<app>` |

Checks before a release: `npm run build` (type-checks, then bundles) and
`npm test` in `web/`.
