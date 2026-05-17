# Backup & Restore Drill — Travidz

**Owner:** Platform admin · **Cadence:** Monthly · **RTO:** 4h · **RPO:** 24h

## What is backed up

Lovable Cloud (Postgres) takes daily automated snapshots of all tables in
the `public` schema, plus `auth.users`. Storage buckets (videos, avatars,
thumbnails) are replicated by the storage provider; object versions are
retained for 30 days.

## Monthly drill — steps

1. **Snapshot check** — in the Lovable Cloud console, confirm the most
   recent successful snapshot is < 24h old. Record timestamp.
2. **Schema diff** — export current schema and diff against last drill:
   ```bash
   pg_dump --schema-only "$PGURL" > /tmp/schema.sql
   diff docs/last-schema.sql /tmp/schema.sql || true
   ```
   Commit the new schema as `docs/last-schema.sql` if it changed.
3. **Point-in-time restore test** — pick a sacrificial table
   (e.g. `deal_discovery_runs`) and verify a row deleted < 1h ago can be
   recovered from the snapshot via PITR. Document the exact steps taken.
4. **Storage object recovery** — delete a test object in `videos/` then
   recover it from the bucket's object-version history. Confirm checksum
   matches.
5. **App smoke test post-restore** — confirm `/`, `/deals`, `/u/<known>`,
   and `/auth/login` all render against the restored state.
6. **Log the drill** — append a row to the table below with date, who ran
   it, RPO observed, RTO observed, and any issues found.

## Drill log

| Date       | Operator | RPO observed | RTO observed | Notes |
|------------|----------|--------------|--------------|-------|
| _pending_  |          |              |              |       |

## Restore runbook (incident)

1. Page on-call admin. Freeze writes by disabling cron jobs:
   `SELECT cron.unschedule(jobid) FROM cron.job;`
2. Restore latest snapshot to a fresh database; verify row counts on
   `profiles`, `videos`, `deals`, `deal_redemptions`, `payout_runs`.
3. Swap connection string via Lovable Cloud console. Re-enable cron:
   re-run the latest `supabase/migrations/*cron*.sql` files.
4. Post-incident: notify affected creators/businesses if any redemption
   or payout state regressed. Manual reconciliation via
   `/admin/payouts`.