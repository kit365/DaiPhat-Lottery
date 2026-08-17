package com.daiphat.coreapi.shared.util.tabular;

import java.util.List;

/**
 * Result of parsing an uploaded .csv / .xlsx file.
 *
 * @param headers        header labels as they appear in the file, de-duplicated
 * @param rows           data rows below the header row
 * @param appliedCharset charset actually used to decode the file (null for .xlsx)
 * @param appliedDelimiter delimiter actually used (null for .xlsx)
 * @param preamble       non-blank rows sitting above the header row. A business
 *                       delivery note opens with a letterhead and a party block
 *                       before the table starts; those rows are not data, but they
 *                       carry who issued the file, so they are kept rather than
 *                       skipped
 */
public record TabularTable(
        List<String> headers,
        List<TabularRow> rows,
        String appliedCharset,
        String appliedDelimiter,
        List<List<String>> preamble
) {

    public TabularTable {
        preamble = preamble == null ? List.of() : List.copyOf(preamble);
    }

    /** A file whose table starts on the first row, so there is no letterhead. */
    public TabularTable(
            List<String> headers,
            List<TabularRow> rows,
            String appliedCharset,
            String appliedDelimiter
    ) {
        this(headers, rows, appliedCharset, appliedDelimiter, List.of());
    }

    public static String positionalKey(int columnIndex) {
        return "COL:" + columnIndex;
    }

    /**
     * True when the given mapping target exists, accepting either a header label
     * or a positional "COL:n" key.
     */
    public boolean hasColumn(String column) {
        if (column == null || column.isBlank()) {
            return false;
        }
        if (headers.contains(column)) {
            return true;
        }
        return rows.stream().anyMatch(row -> row.values().containsKey(column));
    }
}
