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
- `BUNNA_REGISTRY_SERVER`
- `BUNNA_REGISTRY_USERNAME`
- `KAMAL_REGISTRY_PASSWORD`
- `RAILS_MASTER_KEY`
- `BUNNA_APP_HOST`

Do not run `bin/kamal deploy` until the host, registry, DNS, TLS termination,
and backup destination have been chosen explicitly.

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
