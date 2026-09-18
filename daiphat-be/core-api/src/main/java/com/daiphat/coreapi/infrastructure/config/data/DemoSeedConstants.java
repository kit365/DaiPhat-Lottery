package com.daiphat.coreapi.infrastructure.config.data;

/**
 * Shared demo-seed contract for local/prod-fixed fixtures.
 * <p>
 * Pipeline (local / staging / prod when seed flags are on):
 * <ol>
 *   <li>{@link AuthSeedInitializer} — canonical {@code member}/{@code operator}/{@code street_agent}</li>
 *   <li>{@link StreetAgentDemoSeedInitializer} (@Order 25) — ACTIVE profile + signed contract for vendor</li>
 *   <li>{@link SouthernLotteryStationSeedInitializer} — station catalog</li>
 *   <li>{@link LotteryImportBatchSeedInitializer} (@Order 100) — <b>one inventory pool</b>
 *       ({@code PN-SEED-*} / {@code IBSEED-*}), past ≤ N days + today/tomorrow</li>
 *   <li>{@link DemoWinPayoutSeedInitializer} (@Order 105) — mark winners <b>from that pool</b>,
 *       attach COMPLETED orders to {@code member}</li>
 *   <li>Order / vendor / return / settlement seeders (@Order ≥ 108) consume the same pool
 *       (do not invent parallel ticket worlds for buy/payout demos)</li>
 * </ol>
 * Gate with {@code AUTH_SEED_ENABLED}, {@code LOTTERY_SEED_ENABLED}, {@code ORDER_SEED_ENABLED},
 * {@code LOTTERY_SEED_WIN50_PAYOUT_ENABLED}, {@code VENDOR_TEST_SEED_ENABLED} (see application-*.yml).
 * Prefix ownership: one prefix → one seeder may delete/recreate it.
 */
public final class DemoSeedConstants {

    private DemoSeedConstants() {
    }

    /** Import inventory (shared pool for buy / vendor / win / settlement). */
    public static final String IMPORT_BATCH_PREFIX = "PN-SEED-";
    public static final String IMPORT_LINE_PREFIX = "LO-SEED-";
    public static final String INVENTORY_SERIAL_PREFIX = "IBSEED-";
    public static final String INVENTORY_ACTOR = "import-batch-seed";

    /** Win/payout overlay on inventory (never creates a second ticket universe). */
    public static final String WIN_ORDER_PREFIX = "ORD-WIN50-";
    public static final String WIN_PAYMENT_REF_PREFIX = "PAYOS-WIN50-";
    public static final String WIN_SETTLEMENT_PREFIX = "SS-WIN50-";
    public static final String WIN_MARKER = "WIN50_PAYOUT_SEED";

    /** Order lifecycle overlay (ORD-SEED-*). Prefer reserving IBSEED inventory when present. */
    public static final String ORDER_CODE_PREFIX = "ORD-SEED-";

    /** OrderSeed sellable overlay — still linked to MINH_CHINH so vendor handover has cutoff. */
    public static final String ORDER_AVAILABLE_BATCH_PREFIX = "PN-SEED-AVAILABLE-";
    public static final String ORDER_AVAILABLE_LINE_PREFIX = "LO-SEED-AVAILABLE-";

    /** Street-agent demo profile for vendor allocation (AuthSeed user {@code street_agent}). */
    public static final String STREET_AGENT_SEED_MARKER = "STREET_AGENT_DEMO_SEED";
    public static final String STREET_AGENT_CONTRACT_CODE = "HD-SEED-STREET-AGENT";
    public static final String STREET_AGENT_CONTRACT_DOC_URL =
            "https://picsum.photos/seed/street-agent-contract/800/1100";
}

