# Startup demo inventory

When `LOTTERY_SEED_ENABLED=true`, normal startup fills missing inventory for today
and tomorrow using the Vietnam clock and each active southern station's draw schedule.

- A station/date with an existing non-deleted ticket is skipped, including sold-out
  inventory. Restarting does not reset sales or replenish tickets already consumed.
- A missing station/date gets good-condition serials through the existing import seed.
- Today's tickets remain subject to the normal draw cutoff; restarting after the
  cutoff does not reopen today's sales. Tomorrow's tickets can still be purchased.
- With both rebuild flags off, existing orders, payouts, imports and historical demo scenarios are preserved.
- `LOTTERY_SEED_REBUILD_DEMO` defaults to `false`. Full scenario seed runners only
  execute when it is explicitly `true` and their own existing enable flags are on.
  This mode can delete/rebuild demo data and is not needed for everyday restarts.

When `ORDER_SEED_REBUILD_DEMO=true`, the enabled lifecycle order fixtures refresh
on backend startup, including startup after deployment. With
`LOTTERY_SEED_WIN50_PAYOUT_ENABLED=true`, startup also fills missing winning orders
before the official lifecycle matrix runs. `LOTTERY_SEED_REBUILD_DEMO` can stay
`false` throughout this flow.

- In official-demo mode, the expected dataset is six completed orders with 50 G8
  winning tickets: two orders each for `phamngoclinh1` (18 tickets), `vominhquan2`
  (18 tickets), and `dangthikimngan3` (14 tickets).
- Existing winning orders and payout progress are kept; partial datasets only get
  the missing order codes. An ordinary restart does not reset winners.
- If historical inventory is insufficient, the enabled import seeder adds only
  the missing ticket numbers for yesterday's scheduled stations. Once the winning
  orders exist, this extra historical import is skipped. Existing inventory is
  never deleted by this path.
- Tickets linked to orders or with sold, reserved, allocated, returned, or
  payout-related serials are excluded because crafting a winning number changes
  the ticket and its sibling serials.
- Winners require complete official draw results. If result sync is unavailable,
  the seeder logs a deferral and retries on the next startup without deleting
  existing winning orders. The lifecycle matrix still requires its winning-order
  prerequisites and sufficient tomorrow inventory.

Keep the existing account/station bootstrap flags enabled when initializing an
empty demo database. No database volume reset or Flyway history change is required.
