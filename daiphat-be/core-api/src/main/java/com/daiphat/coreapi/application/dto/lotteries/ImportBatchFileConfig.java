package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Operator-tunable rules for reading a supplier file, stored as one JSON entry in
 * system_config under {@code TICKET_IMPORT_FILE_CONFIG}.
 *
 * <p>Only settings that a business owner might genuinely want to change live here.
 * Things fixed by the data model - which columns are mandatory, which draw dates
 * are importable - stay in code, because a config that contradicts a domain rule
 * would just be a lie the backend then rejects.
 *
 * @param allowPartialImport when false, a draw date is only importable if every
 *                           one of its rows is clean
 * @param storeOriginalFile  keep the upload as settlement evidence
 * @param fieldAliases       optional overrides of auto-detect header aliases,
 *                           keyed by mapping field (e.g. {@code stationColumn}).
 *                           Shared by every supplier (N suppliers → 1 config).
 */
@Builder
public record ImportBatchFileConfig(
        int maxFileSizeMb,
        int maxRows,
        String serialSeparator,
        boolean storeOriginalFile,
        boolean allowPartialImport,
        Map<String, List<String>> fieldAliases
) {

    /**
     * In-code fallback when the system_config row is missing. Prefer the seeded
     * {@code TICKET_IMPORT_FILE_CONFIG} row (same aliases) once Flyway / seeder ran.
     */
    public static ImportBatchFileConfig defaults() {
        Map<String, List<String>> aliases = new LinkedHashMap<>();
        aliases.put("drawDateColumn", List.of("ngayquay", "ngayxoso", "ngayso", "ngay", "drawdate", "date"));
        aliases.put("stationCodeColumn", List.of("madai", "manhadai", "ma", "stationcode", "code"));
        aliases.put("stationColumn", List.of("nhadai", "tendai", "dai", "tinh", "station", "lotterystation"));
        aliases.put("quantityColumn", List.of("soluong", "sl", "sove", "quantity", "qty", "amount"));
        aliases.put("numbersColumn", List.of("dayso", "sove", "sodu", "conso", "numbers", "ticketnumber", "so"));
        aliases.put("serialsColumn", List.of("seri", "sori", "soseri", "danhsachseri", "serial", "serials", "serialnumber"));
        aliases.put("ticketImageColumn", List.of(
                "anhve", "hinhve", "anh", "hinh", "ticketimg", "ticketimage", "image", "photo", "url"));
        aliases.put("importCostColumn", List.of(
                "giavon", "dongia", "giave", "importcost", "unitprice", "price", "gia"));
        return ImportBatchFileConfig.builder()
                .maxFileSizeMb(2)
                .maxRows(2000)
                .serialSeparator(";")
                .storeOriginalFile(true)
                .allowPartialImport(true)
                .fieldAliases(aliases)
                .build();
    }

    public long maxFileSizeBytes() {
        return (long) maxFileSizeMb * 1024 * 1024;
    }

    /** Guards against a stored value that would disable the feature or blow up memory. */
    public ImportBatchFileConfig sanitized() {
        ImportBatchFileConfig fallback = defaults();
        return ImportBatchFileConfig.builder()
                .maxFileSizeMb(maxFileSizeMb > 0 && maxFileSizeMb <= 50
                        ? maxFileSizeMb : fallback.maxFileSizeMb())
                .maxRows(maxRows > 0 && maxRows <= 50_000 ? maxRows : fallback.maxRows())
                .serialSeparator(serialSeparator == null || serialSeparator.isEmpty()
                        ? fallback.serialSeparator() : serialSeparator)
                .storeOriginalFile(storeOriginalFile)
                .allowPartialImport(allowPartialImport)
                .fieldAliases(sanitizeAliases(fieldAliases))
                .build();
    }

    private static Map<String, List<String>> sanitizeAliases(Map<String, List<String>> raw) {
        if (raw == null || raw.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, List<String>> cleaned = new LinkedHashMap<>();
        raw.forEach((field, aliases) -> {
            if (field == null || field.isBlank() || aliases == null) {
                return;
            }
            List<String> values = aliases.stream()
                    .filter(alias -> alias != null && !alias.isBlank())
                    .map(String::trim)
                    .map(alias -> alias.toLowerCase().replaceAll("[^a-z0-9]", ""))
                    .filter(alias -> !alias.isEmpty())
                    .distinct()
                    .limit(40)
                    .collect(Collectors.toList());
            if (!values.isEmpty()) {
                cleaned.put(field.trim(), values);
            }
        });
        return cleaned;
    }
}
