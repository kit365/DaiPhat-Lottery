package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileMappingRequest;
import com.daiphat.coreapi.shared.util.tabular.TabularFileParser;
import com.daiphat.coreapi.shared.util.tabular.TabularRow;
import com.daiphat.coreapi.shared.util.tabular.TabularTable;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Guesses which column feeds which field from the header labels, so the common
 * case needs no manual mapping at all.
 */
@Component
public class ImportBatchFileMappingDetector {

    /** Normalized header aliases, most specific first within each field. */
    private static final List<String> DRAW_DATE_ALIASES = List.of(
            "ngayquay", "ngayxoso", "ngayso", "ngay", "drawdate", "date"
    );

    private static final List<String> STATION_CODE_ALIASES = List.of(
            "madai", "manhadai", "ma", "stationcode", "code"
    );

    private static final List<String> STATION_ALIASES = List.of(
            "nhadai", "tendai", "dai", "tinh", "station", "lotterystation"
    );

    private static final List<String> QUANTITY_ALIASES = List.of(
            "soluong", "sl", "sove", "quantity", "qty", "amount"
    );

    /**
     * "gianhap" leads so the exact-match pass claims it before the loose "gia"
     * fallback can grab a neighbouring column such as "Giá bán".
     */
    private static final List<String> IMPORT_COST_ALIASES = List.of(
            "gianhap", "giavon", "giasauhoahong", "dongia", "giave",
            "importcost", "unitprice", "price", "gia"
    );

    private static final List<String> SALE_PRICE_ALIASES = List.of(
            "giaban", "gianiemyet", "menhgia", "saleprice", "facevalue"
    );

    private static final List<String> COMMISSION_RATE_ALIASES = List.of(
            "hoahong", "tylehoahong", "chietkhau", "commission", "commissionrate"
    );

    private static final List<String> NUMBERS_ALIASES = List.of(
            "dayso", "sove", "sodu", "conso", "numbers", "ticketnumber", "so"
    );

    private static final List<String> SERIAL_ALIASES = List.of(
            "seri", "sori", "soseri", "danhsachseri", "serial", "serials", "serialnumber"
    );

    private static final List<String> TICKET_IMAGE_ALIASES = List.of(
            "anhve", "hinhve", "anh", "hinh", "ticketimg", "ticketimage", "image", "photo", "url"
    );

    /**
     * Built-in header spellings recognised for each mapping field.
     *
     * <p>Canonical live copy is stored in {@code system_config.TICKET_IMPORT_FILE_CONFIG}
     * ({@code fieldAliases}) and edited from the supplier / file-import UI.
     * This dictionary is the fallback when the DB row is missing or has an empty
     * {@code fieldAliases} map — keep it in sync with the Flyway seed.
     */
    public Map<String, List<String>> defaultAliasDictionary() {
        return Map.of(
                "drawDateColumn", DRAW_DATE_ALIASES,
                "stationCodeColumn", STATION_CODE_ALIASES,
                "stationColumn", STATION_ALIASES,
                "quantityColumn", QUANTITY_ALIASES,
                "numbersColumn", NUMBERS_ALIASES,
                "serialsColumn", SERIAL_ALIASES,
                "ticketImageColumn", TICKET_IMAGE_ALIASES,
                "importCostColumn", IMPORT_COST_ALIASES,
                "salePriceColumn", SALE_PRICE_ALIASES,
                "commissionRateColumn", COMMISSION_RATE_ALIASES
        );
    }

    /** @deprecated use {@link #defaultAliasDictionary()} or {@link #resolveAliases(Map)} */
    public Map<String, List<String>> aliasDictionary() {
        return defaultAliasDictionary();
    }

    /**
     * Merges operator overrides onto the built-in dictionary. Unknown field keys
     * are ignored so a bad settings row cannot invent unsupported columns.
     */
    public Map<String, List<String>> resolveAliases(Map<String, List<String>> overrides) {
        Map<String, List<String>> defaults = defaultAliasDictionary();
        if (overrides == null || overrides.isEmpty()) {
            return defaults;
        }
        Map<String, List<String>> merged = new LinkedHashMap<>();
        defaults.forEach((field, builtin) -> {
            List<String> override = overrides.get(field);
            if (override == null || override.isEmpty()) {
                merged.put(field, builtin);
                return;
            }
            List<String> cleaned = new ArrayList<>();
            for (String alias : override) {
                if (alias == null || alias.isBlank()) {
                    continue;
                }
                String normalized = VietnameseTextNormalizer.normalizeHeader(alias);
                if (!normalized.isEmpty() && !cleaned.contains(normalized)) {
                    cleaned.add(normalized);
                }
            }
            merged.put(field, cleaned.isEmpty() ? builtin : List.copyOf(cleaned));
        });
        return merged;
    }

    /**
     * How far down a file the header row is still looked for. A business delivery
     * note opens with a letterhead and a party block, but never a page of them.
     */
    private static final int MAX_HEADER_ROW_SCAN = 20;

    /**
     * Fields that only a real header row carries. A letterhead line may happen to
     * contain "ngay" or "dai"; it will not also name a serial or a quantity column.
     */
    private static final List<String> HEADER_EVIDENCE_FIELDS = List.of(
            "serialsColumn", "numbersColumn", "quantityColumn",
            "stationColumn", "stationCodeColumn", "drawDateColumn"
    );

    /** A row must name at least this many mapping fields to be taken as the header. */
    private static final int MIN_HEADER_EVIDENCE = 3;

    public ImportBatchFileMappingRequest detect(TabularTable table) {
        return detect(table, defaultAliasDictionary());
    }

    /**
     * Finds which row actually carries the column labels, for files that open with
     * a letterhead instead of the table.
     *
     * <p>The table must have been parsed with header row 0, so that every row of
     * the file is still visible here: index 0 means its first non-blank row is the
     * header, index n means n rows must be skipped before the table starts.
     *
     * <p>Scoring beats "first row wins" because a letterhead row is wide and vague
     * while a header row names several distinct fields at once. Row 0 keeps the
     * benefit of the doubt on a tie, so a plain export is never re-interpreted.
     *
     * @return 0-based index among the file's non-blank rows
     */
    public int detectHeaderRowIndex(TabularTable table, Map<String, List<String>> aliases) {
        Map<String, List<String>> resolved = aliases == null || aliases.isEmpty()
                ? defaultAliasDictionary()
                : aliases;

        int bestIndex = 0;
        int bestScore = headerEvidence(table.headers(), resolved);
        if (bestScore >= MIN_HEADER_EVIDENCE) {
            return 0;
        }

        int limit = Math.min(table.rows().size(), MAX_HEADER_ROW_SCAN);
        for (int offset = 0; offset < limit; offset++) {
            int score = headerEvidence(positionalCells(table.rows().get(offset)), resolved);
            if (score > bestScore) {
                bestScore = score;
                // Row 0 of the table is the file's second non-blank row.
                bestIndex = offset + 1;
            }
        }
        return bestScore >= MIN_HEADER_EVIDENCE ? bestIndex : 0;
    }

    /**
     * How many distinct mapping fields this row's cells could name.
     *
     * <p>Exact alias hits only - deliberately stricter than {@link #firstMatch},
     * which may settle for a substring once the header row is already known. Here
     * the row's identity is still in question, and loose matching mistakes prose
     * for labels: "Mẫu số" contains the station-code alias "ma", a company name
     * ending in "... Đại Phát" contains the station alias "dai". A real header
     * cell is the label and nothing else, so requiring the whole cell to be the
     * alias costs nothing and rules those out.
     */
    private int headerEvidence(List<String> cells, Map<String, List<String>> aliases) {
        if (cells == null || cells.isEmpty()) {
            return 0;
        }
        Set<String> normalizedCells = new HashSet<>();
        for (String cell : cells) {
            String normalized = VietnameseTextNormalizer.normalizeHeader(cell);
            if (!normalized.isEmpty()) {
                normalizedCells.add(normalized);
            }
        }

        int score = 0;
        for (String field : HEADER_EVIDENCE_FIELDS) {
            List<String> fieldAliases = aliases.get(field);
            if (fieldAliases != null && fieldAliases.stream().anyMatch(normalizedCells::contains)) {
                score++;
            }
        }
        return score;
    }

    /**
     * Reads a row back as an ordered cell list. Positional keys survive whatever
     * the header row happened to be called, which is exactly what is needed while
     * the real header is still unknown.
     */
    private List<String> positionalCells(TabularRow row) {
        List<String> cells = new ArrayList<>();
        for (int index = 0; index < TabularFileParser.MAX_COLUMNS; index++) {
            String value = row.values().get(TabularTable.positionalKey(index));
            if (value == null) {
                break;
            }
            cells.add(value);
        }
        return cells;
    }

    public ImportBatchFileMappingRequest detect(TabularTable table, Map<String, List<String>> aliases) {
        return detect(table, aliases, 0);
    }

    /**
     * @param headerRowIndex where the header row was found, echoed back into the
     *                       mapping so every later parse of the same file skips the
     *                       letterhead the same way
     */
    public ImportBatchFileMappingRequest detect(
            TabularTable table,
            Map<String, List<String>> aliases,
            int headerRowIndex
    ) {
        Map<String, List<String>> resolved = aliases == null || aliases.isEmpty()
                ? defaultAliasDictionary()
                : aliases;

        Map<String, String> byNormalizedHeader = table.headers().stream()
                .collect(Collectors.toMap(
                        VietnameseTextNormalizer::normalizeHeader,
                        header -> header,
                        (first, duplicate) -> first
                ));

        return ImportBatchFileMappingRequest.builder()
                .headerRowIndex(Math.max(headerRowIndex, 0))
                .delimiter(table.appliedDelimiter())
                .charset(table.appliedCharset())
                .drawDateColumn(firstMatch(byNormalizedHeader, resolved.get("drawDateColumn")))
                .stationCodeColumn(firstMatch(byNormalizedHeader, resolved.get("stationCodeColumn")))
                .stationColumn(firstMatch(byNormalizedHeader, resolved.get("stationColumn")))
                .quantityColumn(firstMatch(byNormalizedHeader, resolved.get("quantityColumn")))
                .numbersColumn(firstMatch(byNormalizedHeader, resolved.get("numbersColumn")))
                .serialsColumn(firstMatch(byNormalizedHeader, resolved.get("serialsColumn")))
                .ticketImageColumn(firstMatch(byNormalizedHeader, resolved.get("ticketImageColumn")))
                // Without this the alias dictionary advertised an import-cost column
                // that auto-detection then silently dropped, forcing manual mapping.
                .importCostColumn(firstMatch(byNormalizedHeader, resolved.get("importCostColumn")))
                .salePriceColumn(firstMatch(byNormalizedHeader, resolved.get("salePriceColumn")))
                .commissionRateColumn(firstMatch(byNormalizedHeader, resolved.get("commissionRateColumn")))
                .serialSeparator(ImportBatchFileMappingRequest.DEFAULT_SERIAL_SEPARATOR)
                .build();
    }

    /**
     * Stable fingerprint of a file's header layout: the same supplier template
     * always produces the same signature, so a saved mapping profile can be found
     * again even if the columns were reordered.
     */
    public String headerSignature(List<String> headers) {
        String canonical = headers.stream()
                .map(VietnameseTextNormalizer::normalizeHeader)
                .filter(header -> !header.isEmpty())
                .sorted()
                .collect(Collectors.joining("|"));
        return sha256(canonical);
    }

    public String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required but unavailable", e);
        }
    }

    public String sha256(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required but unavailable", e);
        }
    }

    private String firstMatch(Map<String, String> byNormalizedHeader, List<String> aliases) {
        if (aliases == null || aliases.isEmpty()) {
            return null;
        }
        // Exact alias hits first: "gia" must not win a column literally called "gia von".
        for (String alias : aliases) {
            String header = byNormalizedHeader.get(alias);
            if (header != null) {
                return header;
            }
        }
        for (String alias : aliases) {
            for (Map.Entry<String, String> entry : byNormalizedHeader.entrySet()) {
                if (entry.getKey().contains(alias)) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }
}
