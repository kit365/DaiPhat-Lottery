package com.daiphat.coreapi.infrastructure.config.data;

import java.util.List;

/**
 * Shared demo-seed contract for local/prod-fixed fixtures.
 * <p>
 * Pipeline (local / staging / prod when seed flags are on):
 * <ol>
 *   <li>{@link AuthSeedInitializer} — canonical {@code member}/{@code operator}/{@code street_agent}</li>
 *   <li>{@link StreetAgentDemoSeedInitializer} (@Order 25) — ACTIVE profile + signed contract for vendor</li>
 *   <li>{@link SouthernLotteryStationSeedInitializer} — station catalog</li>
 *   <li>{@link LotteryImportBatchSeedInitializer} (@Order 100) — <b>one inventory pool</b>
 *       (phiếu {@code PN-*} / serial {@code IBSEED-*}), past ≤ N days + today/tomorrow</li>
 *   <li>{@link Win50PayoutSeedInitializer} (@Order 105) — mark {@code 8} winners <b>from that pool</b>
 *       on real Miền Nam stations, attach one COMPLETED order to {@code member} for payout/request demos</li>
 *   <li>Order / vendor / return / settlement seeders (@Order ≥ 108) consume the same pool
 *       (do not invent parallel ticket worlds for buy/payout demos)</li>
 * </ol>
 * Gate with {@code AUTH_SEED_ENABLED}, {@code LOTTERY_SEED_ENABLED}, {@code ORDER_SEED_ENABLED},
 * {@code LOTTERY_SEED_WIN50_PAYOUT_ENABLED}, {@code VENDOR_TEST_SEED_ENABLED} (see application-*.yml).
 * Document codes (mã phiếu) use {@link SeedDocumentCodes} — production PN/LO/PT/DS shape.
 * <p>
 * Suppliers visible in UI: only {@link #SUPPLIER_MINH_CHINH_CODE} and {@link #SUPPLIER_MINH_NGOC_CODE}.
 */
public final class SharedSeedConstants {

    private SharedSeedConstants() {
    }

    /** Canonical suppliers (real names only — no test/demo/QA labels in UI). */
    public static final String SUPPLIER_MINH_CHINH_CODE = "MINH_CHINH";
    public static final String SUPPLIER_MINH_CHINH_NAME = "Minh Chính";
    public static final String SUPPLIER_MINH_NGOC_CODE = "MINH_NGOC";
    public static final String SUPPLIER_MINH_NGOC_NAME = "Minh Ngọc";

    /** Legacy import code prefixes (cleanup only — UI codes use {@link SeedDocumentCodes}). */
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

    /** Vendor allocation inventory under Minh Ngọc. */
    public static final String VENDOR_BATCH_PREFIX = "PN-SEED-VN-";
    public static final String VENDOR_SERIAL_PREFIX = "IBVN-";
    public static final String VENDOR_SEED_MARKER = "VENDOR_ALLOC_SEED";
    /** Legacy prefixes cleaned / ignored after rename. */
    public static final String LEGACY_VENDOR_BATCH_PREFIX = "LOCAL-VENDOR-";
    public static final String LEGACY_VENDOR_SERIAL_PREFIX = "VENDOR-TEST-";

    /** Lucky-pattern inventory under Minh Ngọc. */
    public static final String LUCKY_BATCH_PREFIX = "PN-SEED-LP-";
    public static final String LUCKY_SERIAL_PREFIX = "IBLP-";
    public static final String LUCKY_SEED_MARKER = "LUCKY_PATTERN_SEED";
    public static final String LEGACY_LUCKY_BATCH_PREFIX = "LOCAL-LUCKY-";
    public static final String LEGACY_LUCKY_SERIAL_PREFIX = "LUCKY-TEST-";

    /** Actors that create seed import phiếu — cleanup after codes match production PN/LO. */
    public static final List<String> IMPORT_SEED_ACTORS = List.of(
            INVENTORY_ACTOR,
            "status-coverage-seed",
            "settlement-scenario-seed",
            VENDOR_SEED_MARKER,
            LUCKY_SEED_MARKER,
            "order-seed"
    );

    /** Street-agent demo profile for vendor allocation (AuthSeed user {@code street_agent}). */
    public static final String STREET_AGENT_SEED_MARKER = "STREET_AGENT_DEMO_SEED";
    public static final String STREET_AGENT_CONTRACT_CODE = "HD-SEED-STREET-AGENT";
    public static final String STREET_AGENT_CONTRACT_DOC_URL =
            "https://picsum.photos/seed/street-agent-contract/800/1100";
}
