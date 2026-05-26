# Production Deployment

The production deployment is intentionally conservative because the PostgreSQL
container contains live data.

## GitHub Secrets

Configure these repository secrets before enabling the workflow:

- `PROD_HOST`: production server IP or hostname
- `PROD_USER`: restricted SSH user, for example `deploy-conregation`
- `PROD_SSH_PRIVATE_KEY`: private key for the restricted deploy user

## Safety Rules

The deploy user should be configured with an SSH forced command that can only
run the server-side deployment command. Do not use a personal admin user for
GitHub Actions.

The deploy script refuses to run if the production checkout has uncommitted,
staged, untracked, or non-fast-forward changes. This prevents CI from
overwriting live-only edits.

Before updating code, the script creates a compressed `pg_dump` backup in:

```text
/home/luca/services/conregation-organizer/backups
```

The script updates only these services:

```text
co_server
co_client
```

It does not run `docker compose down`, does not remove volumes, and does not
recreate `co_db`.

## Current Server State

As of setup, the production checkout contains local commits and uncommitted
changes that are not on `origin/main`. The first CI run will correctly abort
until those live changes are committed and pushed or otherwise reconciled.
