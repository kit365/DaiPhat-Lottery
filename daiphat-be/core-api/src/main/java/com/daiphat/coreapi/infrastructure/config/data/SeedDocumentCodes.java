package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Objects;

/**
 * Single naming helper for seed phiếu nhập / lô / phiếu trả / đối soát.
 * <p>
 * Mirrors production generators:
 * <ul>
 *   <li>Nhập: {@code PN-{yyyyMMdd}-{seq}} — {@link com.daiphat.coreapi.shared.util.ImportBatchCodeGenerator}</li>
 *   <li>Lô: {@code LO-{yyyyMMdd}-{station}-{type}-{seq}}</li>
 *   <li>Trả: {@code PT-{yyyyMMdd}-{seq}} — {@link com.daiphat.coreapi.shared.util.ReturnBatchCodeGenerator}</li>
 *   <li>Đối soát: {@code DS-{yyyyMMdd}-{seq}} — {@link com.daiphat.coreapi.shared.util.SupplierSettlementCodeGenerator}</li>
 * </ul>
 * Sequence is caller-owned (lane + index) so seeds stay idempotent without SEED/SETTLE tags in UI codes.
 */
public final class SeedDocumentCodes {

    public static final String IMPORT_HEADER_PREFIX = "PN";
    public static final String IMPORT_LINE_PREFIX = "LO";
    public static final String RETURN_PREFIX = "PT";
    public static final String SETTLEMENT_PREFIX = "DS";
    public static final String SEGMENT = "-";

    /** Internal note markers for seed cleanup (not shown as mã phiếu). */
    public static final String RETURN_NOTE_PREFIX = "SEED-RETURN-";
    public static final String IMPORT_NOTE_PREFIX = "SEED-IMPORT-";

    /** Sequence lanes — keep seed codes unique across seeders. */
    public static final int LANE_IMPORT_MAIN = 1;
    public static final int LANE_IMPORT_STATUS = 3_000;
    public static final int LANE_IMPORT_SETTLE = 4_000;
    public static final int LANE_IMPORT_VENDOR = 5_000;
    public static final int LANE_IMPORT_LUCKY = 6_000;
    public static final int LANE_IMPORT_ORDER_AVAILABLE = 7_000;
    public static final int LANE_IMPORT_LINE_MAIN = 1;
    public static final int LANE_IMPORT_LINE_STATUS = 30_000;
    public static final int LANE_IMPORT_LINE_SETTLE = 40_000;
    public static final int LANE_IMPORT_LINE_VENDOR = 50_000;
    public static final int LANE_IMPORT_LINE_LUCKY = 60_000;
    public static final int LANE_IMPORT_LINE_ORDER_AVAILABLE = 70_000;
    public static final int LANE_RETURN_MAIN = 1;
    public static final int LANE_RETURN_SETTLE = 7_000;
    public static final int LANE_SETTLEMENT_SCENARIO = 8_000;

    /** Legacy UI prefixes cleaned on re-seed (pre-unification). */
    public static final String[] LEGACY_IMPORT_HEADER_PREFIXES = {
            "PN-SEED-",
            "PN-STATUS-",
            "PN-SETTLE-",
            "PN-SEED-AVAILABLE-",
            "PN-SEED-VN-",
            "PN-SEED-LP-",
            "LOCAL-VENDOR-",
            "LOCAL-LUCKY-"
    };

    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private SeedDocumentCodes() {
    }

    public static String importHeader(LocalDate drawDate, int sequence) {
        return join(IMPORT_HEADER_PREFIX, dateToken(drawDate), seq4(sequence));
    }

    public static String importLine(
            LocalDate drawDate,
            String stationName,
            ImportBatchType batchType,
            int sequence
    ) {
        return join(
                IMPORT_LINE_PREFIX,
                dateToken(drawDate),
                toStationCode(stationName),
                toTypeCode(batchType),
                seq4(sequence)
        );
    }

    public static String returnBatch(LocalDate drawDate, int sequence) {
        return join(RETURN_PREFIX, dateToken(drawDate), seq4(sequence));
    }

    public static String settlement(LocalDate periodFrom, int sequence) {
        return join(SETTLEMENT_PREFIX, dateToken(periodFrom), seq4(sequence));
    }

    public static String returnNote(String supplierCode, LocalDate drawDate) {
        return RETURN_NOTE_PREFIX + Objects.toString(supplierCode, "SUPPLIER") + "-" + drawDate;
    }

    public static String importNote(String lane, LocalDate drawDate) {
        return IMPORT_NOTE_PREFIX + Objects.toString(lane, "MAIN") + "-" + drawDate;
    }

    public static String dateToken(LocalDate date) {
        return (date != null ? date : LocalDate.now()).format(BASIC_DATE);
    }

    public static String seq4(int sequence) {
        int safe = Math.max(1, sequence);
        if (safe > 9_999) {
            safe = (safe % 9_999) + 1;
        }
        return String.format("%04d", safe);
    }

    public static String toStationCode(String stationName) {
        if (stationName == null || stationName.isBlank()) {
            return "STATION";
        }
        String normalized = Normalizer.normalize(stationName.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .replaceAll("[^A-Za-z0-9]+", "")
                .toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "STATION";
        }
        return normalized.length() > 16 ? normalized.substring(0, 16) : normalized;
    }

    public static String toTypeCode(ImportBatchType batchType) {
        if (batchType == null) {
            return "UNK";
        }
        return switch (batchType) {
            case NEW -> "NEW";
            case SUPPLEMENTARY -> "SUPP";
            case ADJUSTMENT -> "ADJ";
        };
    }

    private static String join(String... parts) {
        return String.join(SEGMENT, parts);
    }
}
