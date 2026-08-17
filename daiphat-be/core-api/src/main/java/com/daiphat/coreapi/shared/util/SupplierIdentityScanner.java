package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileSupplierIdentityResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

/**
 * Reads the party block at the top of a supplier's delivery note and checks it
 * against the supplier chosen in the import dialog.
 *
 * <p>The block is free-form on purpose: suppliers lay their letterhead out however
 * their accounting software does. What every layout has in common is a label
 * beside its value - "Mã số thuế: 0301234567" in one cell, or "Mã số thuế" in one
 * cell and the number in the next. Both shapes are read here.
 *
 * <p>Comparison is by meaning, not by spelling: a tax code written "0301234567"
 * and "03-0123-4567" is the same tax code, and a phone written "0909123456" and
 * "+84 909 123 456" is the same line. Only a real disagreement is reported.
 */
@Component
public class SupplierIdentityScanner {

    /** Cells scanned per row before giving up; a letterhead is never this wide. */
    private static final int MAX_CELLS_PER_ROW = 20;

    private static final String LABEL_VALUE_SEPARATORS = ":：=";

    /**
     * Qualifiers marking a label as belonging to the receiving side of the note,
     * not to the supplier.
     *
     * <p>A delivery note names two parties, and their fields are labelled with the
     * same words: "Mã số thuế" for the supplier and "Mã số thuế bên nhận" for us.
     * Read naively the second is a tax code like any other, and whichever comes
     * first in the sheet wins - so a correct file would be rejected because our own
     * tax code does not match the supplier's. These qualifiers are checked before
     * any alias, so the receiving block is skipped rather than raced.
     */
    private static final List<String> COUNTERPARTY_QUALIFIERS = List.of(
            "bennhan", "benmua", "nguoinhan", "nguoinhap", "nguoilap", "nguoiduyet",
            "nguoikiem", "thukho", "khonhan", "receiver", "buyer"
    );

    /**
     * One identifying field: how it is labelled, how it is read out of the
     * supplier record, and how two spellings of it are made comparable.
     *
     * <p>Declared most specific first. "Mã số thuế" and "Mã nhà cung cấp" both
     * begin with "ma", so the longest matching alias wins rather than the first.
     */
    private record IdentityField(
            String key,
            String label,
            List<String> aliases,
            Function<LotterySupplierModel, String> reader,
            Function<String, String> canonicalizer,
            boolean blocking,
            /**
             * True when a bare label is too generic to attribute on its own, and
             * only counts once the supplier's block has demonstrably started.
             */
            boolean needsSupplierContext
    ) {
        IdentityField(
                String key,
                String label,
                List<String> aliases,
                Function<LotterySupplierModel, String> reader,
                Function<String, String> canonicalizer,
                boolean blocking
        ) {
            this(key, label, aliases, reader, canonicalizer, blocking, false);
        }
    }

    private static final List<IdentityField> FIELDS = List.of(
            new IdentityField(
                    "taxCode",
                    "Mã số thuế",
                    List.of("masothue", "mst", "masothuenhacungcap", "taxcode", "taxid", "vatcode"),
                    LotterySupplierModel::getTaxCode,
                    SupplierIdentityScanner::digitsOnly,
                    true),
            new IdentityField(
                    "code",
                    "Mã nhà cung cấp",
                    List.of("manhacungcap", "mancc", "masonhacungcap", "madoitac", "manhaphanphoi",
                            "suppliercode", "vendorcode", "partnercode"),
                    LotterySupplierModel::getCode,
                    SupplierIdentityScanner::alphanumericUpper,
                    true),
            new IdentityField(
                    "contactPhone",
                    "Số điện thoại",
                    List.of("sodienthoai", "dienthoai", "sdt", "phone", "telephone", "tel", "hotline"),
                    LotterySupplierModel::getContactPhone,
                    SupplierIdentityScanner::phoneDigits,
                    true),
            new IdentityField(
                    "name",
                    "Nhà cung cấp",
                    List.of("tennhacungcap", "nhacungcap", "donvicungcap", "donvigiaove", "benban",
                            "tendonvi", "suppliername", "supplier", "vendor", "ncc"),
                    LotterySupplierModel::getName,
                    VietnameseTextNormalizer::normalize,
                    true),
            new IdentityField(
                    "contactName",
                    "Người liên hệ",
                    List.of("nguoilienhe", "nguoidaidien", "nguoigiaove", "nguoigiaohang", "lienhe",
                            "contactname", "contactperson", "contact"),
                    LotterySupplierModel::getContactName,
                    VietnameseTextNormalizer::normalize,
                    false),
            new IdentityField(
                    "contactEmail",
                    "Email",
                    List.of("email", "thudientu", "diachiemail", "mail"),
                    LotterySupplierModel::getContactEmail,
                    SupplierIdentityScanner::lowerTrim,
                    false),
            // Reported but not blocking. An address is prose, not an identifier:
            // "25 Lê Lợi, Q.1" and "Số 25 Lê Lợi, Quận 1" are the same place, and
            // no normalization settles every such pair. Blocking on it would
            // reject good deliveries over punctuation, while the tax code and
            // supplier code already pin the company down. Surfacing it still
            // catches the real case - a supplier that moved and never told anyone.
            new IdentityField(
                    "address",
                    "Địa chỉ",
                    List.of("diachinhacungcap", "diachi", "trusochinh", "address"),
                    LotterySupplierModel::getAddress,
                    SupplierIdentityScanner::addressKey,
                    false,
                    // A delivery note opens with the issuer's own letterhead, whose
                    // address line is labelled exactly like the supplier's. Reading
                    // the first "Địa chỉ" would compare our address against theirs
                    // and always disagree, so it counts only after the supplier's
                    // own block has started.
                    true)
    );

    /**
     * @param preamble the file's rows above the header row, as parsed
     * @param supplier the supplier selected in the dialog
     */
    public ImportBatchFileSupplierIdentityResponse scan(
            List<List<String>> preamble,
            LotterySupplierModel supplier
    ) {
        if (preamble == null || preamble.isEmpty() || supplier == null) {
            return ImportBatchFileSupplierIdentityResponse.notDeclared();
        }

        Map<String, String> declaredByField = readDeclaredValues(preamble);
        if (declaredByField.isEmpty()) {
            return ImportBatchFileSupplierIdentityResponse.notDeclared();
        }

        List<ImportBatchFileSupplierIdentityResponse.Field> fields = new ArrayList<>();
        boolean mismatched = false;
        for (IdentityField field : FIELDS) {
            String inFile = declaredByField.get(field.key());
            if (inFile == null) {
                continue;
            }
            String inSystem = field.reader().apply(supplier);
            // A field the supplier record simply does not hold cannot contradict
            // the file; flagging it would only push staff to edit good data.
            boolean matched = !hasText(inSystem)
                    || field.canonicalizer().apply(inFile).equals(field.canonicalizer().apply(inSystem));
            if (!matched && field.blocking()) {
                mismatched = true;
            }
            fields.add(ImportBatchFileSupplierIdentityResponse.Field.builder()
                    .field(field.key())
                    .label(field.label())
                    .valueInFile(inFile)
                    .valueInSystem(inSystem)
                    .matched(matched)
                    .blocking(field.blocking())
                    .build());
        }

        return ImportBatchFileSupplierIdentityResponse.builder()
                .declared(!fields.isEmpty())
                .mismatched(mismatched)
                .fields(List.copyOf(fields))
                .build();
    }

    /** Names every field that disagrees, so the banner says what to fix. */
    public String mismatchMessage(
            ImportBatchFileSupplierIdentityResponse identity,
            LotterySupplierModel supplier
    ) {
        List<String> parts = new ArrayList<>();
        for (ImportBatchFileSupplierIdentityResponse.Field field : identity.fields()) {
            if (field.matched() || !field.blocking()) {
                continue;
            }
            parts.add(String.format("%s trong tệp là \"%s\" nhưng hệ thống ghi \"%s\"",
                    field.label(), field.valueInFile(), field.valueInSystem()));
        }
        return String.format(
                "Tệp không phải của nhà cung cấp đã chọn (%s): %s. "
                        + "Vui lòng chọn đúng nhà cung cấp hoặc dùng tệp của nhà cung cấp này.",
                supplier.getName(), String.join("; ", parts));
    }

    // ------------------------------------------------------------ reading

    /**
     * Walks the letterhead and keeps the first value found for each field.
     *
     * <p>First wins because a delivery note states the supplier once at the top;
     * a later repeat is a footer or a signature line, where the value is often
     * abbreviated.
     */
    private Map<String, String> readDeclaredValues(List<List<String>> preamble) {
        Map<String, String> found = new LinkedHashMap<>();
        for (List<String> row : preamble) {
            if (row == null) {
                continue;
            }
            int limit = Math.min(row.size(), MAX_CELLS_PER_ROW);
            for (int index = 0; index < limit; index++) {
                String cell = row.get(index);
                if (cell == null || cell.isBlank()) {
                    continue;
                }

                // "Mã số thuế: 0301234567" - label and value share one cell.
                int separator = indexOfSeparator(cell);
                if (separator >= 0) {
                    IdentityField field = matchLabel(cell.substring(0, separator));
                    String value = cell.substring(separator + 1).trim();
                    if (field != null && isFilledIn(value) && inScope(field, found)) {
                        found.putIfAbsent(field.key(), value);
                        continue;
                    }
                }

                // "Mã số thuế" | "0301234567" - label and value are neighbours.
                IdentityField field = matchLabel(cell);
                if (field == null) {
                    continue;
                }
                String value = nextNonBlank(row, index + 1, limit);
                if (value != null && inScope(field, found)) {
                    found.putIfAbsent(field.key(), value);
                }
            }
        }
        return found;
    }

    /**
     * Whether a label may be attributed to the supplier at this point in the read.
     *
     * <p>Specific labels stand alone. A generic one - "Địa chỉ" being the only
     * case today - is claimed by whichever party block it sits in, so it counts
     * only once a field that names the supplier unambiguously has already been
     * read. Everything above that point belongs to the issuer's letterhead.
     */
    private boolean inScope(IdentityField field, Map<String, String> alreadyFound) {
        return !field.needsSupplierContext() || !alreadyFound.isEmpty();
    }

    private int indexOfSeparator(String cell) {
        for (int index = 0; index < cell.length(); index++) {
            if (LABEL_VALUE_SEPARATORS.indexOf(cell.charAt(index)) >= 0) {
                return index;
            }
        }
        return -1;
    }

    private String nextNonBlank(List<String> row, int from, int limit) {
        for (int index = from; index < limit; index++) {
            String value = row.get(index);
            if (isFilledIn(value)) {
                return value.trim();
            }
        }
        return null;
    }

    /**
     * A printed form leaves a field open as a run of dots or underscores. Read
     * literally that is a value, and it would contradict every supplier record -
     * so a cell carrying no letter or digit counts as not filled in.
     */
    private static boolean isFilledIn(String value) {
        return value != null && value.chars().anyMatch(Character::isLetterOrDigit);
    }

    /**
     * @return the field this cell labels, or null when the cell is not a label.
     *         The longest matching alias wins, so "Mã số thuế" is not read as the
     *         shorter "Mã ..." of a supplier code
     */
    private IdentityField matchLabel(String rawCell) {
        String normalized = VietnameseTextNormalizer.normalizeHeader(rawCell);
        if (normalized.isEmpty() || normalized.length() > 40 || namesAnotherParty(normalized)) {
            return null;
        }

        IdentityField best = null;
        int bestLength = 0;
        for (IdentityField field : FIELDS) {
            for (String alias : field.aliases()) {
                if (!normalized.contains(alias) || alias.length() <= bestLength) {
                    continue;
                }
                best = field;
                bestLength = alias.length();
            }
        }
        return best;
    }

    // ----------------------------------------------------- canonicalizing

    private static boolean namesAnotherParty(String normalizedLabel) {
        return COUNTERPARTY_QUALIFIERS.stream().anyMatch(normalizedLabel::contains);
    }

    private static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private static String alphanumericUpper(String value) {
        return value == null
                ? ""
                : value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    /**
     * Compares the subscriber number only: the same line is written "0909123456",
     * "+84909123456" and "84 909 123 456" depending on who typed it.
     */
    private static String phoneDigits(String value) {
        String digits = digitsOnly(value);
        if (digits.startsWith("84") && digits.length() > 9) {
            digits = digits.substring(2);
        }
        while (digits.startsWith("0")) {
            digits = digits.substring(1);
        }
        return digits;
    }

    /**
     * Flattens an address to what it actually names: diacritics, case, punctuation
     * and the abbreviations Vietnamese addresses alternate between are all dropped,
     * so "25 Lê Lợi, Q.1" and "Số 25 Lê Lợi, Quận 1" compare equal.
     */
    private static String addressKey(String value) {
        String normalized = VietnameseTextNormalizer.normalize(value);
        if (normalized.isEmpty()) {
            return "";
        }
        normalized = normalized
                .replaceAll("\\bso\\b", "")
                .replaceAll("\\bq\\b", "quan")
                .replaceAll("\\bp\\b", "phuong")
                .replaceAll("\\bh\\b", "huyen")
                .replaceAll("\\btp\\b", "thanhpho")
                .replaceAll("\\btt\\b", "thitran");
        return normalized.replaceAll("[^a-z0-9]", "");
    }

    private static String lowerTrim(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
