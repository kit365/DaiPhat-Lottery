# Startup demo inventory

When `LOTTERY_SEED_ENABLED=true`, normal startup fills missing inventory for today
and tomorrow using the Vietnam clock and each active southern station's draw schedule.

- A station/date with an existing non-deleted ticket is skipped, including sold-out
  inventory. Restarting does not reset sales or replenish tickets already consumed.
- A missing station/date gets good-condition serials through the existing import seed.
- Today's tickets remain subject to the normal draw cutoff; restarting after the
  cutoff does not reopen today's sales. Tomorrow's tickets can still be purchased.
- Existing orders, payouts, imports and historical demo scenarios are preserved.
- `LOTTERY_SEED_REBUILD_DEMO` defaults to `false`. Full scenario seed runners only
  execute when it is explicitly `true` and their own existing enable flags are on.
  This mode can delete/rebuild demo data and is not needed for everyday restarts.

Keep the existing account/station bootstrap flags enabled when initializing an
empty demo database. No database volume reset or Flyway history change is required.
