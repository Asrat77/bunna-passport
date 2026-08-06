# Bunna Passport operations

This document prepares the V1 backend for a single-host Kamal deployment. It
does not authorize or perform a production deployment.

## Persistent data

The Kamal configuration mounts `bunna_passport_storage` at `/rails/storage`.
That one volume contains the primary SQLite database, Solid Queue, Solid Cache,
Solid Cable, and local Active Storage files. The `/up` endpoint is the container
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
