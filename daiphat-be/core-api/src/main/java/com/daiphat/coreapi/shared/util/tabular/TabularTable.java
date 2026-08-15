package com.daiphat.coreapi.shared.util.tabular;

import java.util.List;

/**
 * Result of parsing an uploaded .csv / .xlsx file.
 *
 * @param headers        header labels as they appear in the file, de-duplicated
 * @param rows           data rows below the header row
 * @param appliedCharset charset actually used to decode the file (null for .xlsx)
 * @param appliedDelimiter delimiter actually used (null for .xlsx)
 */
public record TabularTable(
        List<String> headers,
        List<TabularRow> rows,
        String appliedCharset,
        String appliedDelimiter
) {

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
