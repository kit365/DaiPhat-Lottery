package com.daiphat.coreapi.shared.util.tabular;

/**
 * Parsing knobs the user can override from the mapping step.
 * Null means "detect automatically".
 *
 * @param headerRowIndex 0-based index of the header row among non-blank rows
 * @param delimiter      single-character CSV delimiter, or null to auto-detect
 * @param charset        charset name, or null to detect from BOM / trial decode
 * @param maxRows        row cap, or null to use the parser default
 */
public record TabularParseOptions(
        Integer headerRowIndex,
        String delimiter,
        String charset,
        Integer maxRows
) {

    public TabularParseOptions(Integer headerRowIndex, String delimiter, String charset) {
        this(headerRowIndex, delimiter, charset, null);
    }

    public static TabularParseOptions auto() {
        return new TabularParseOptions(null, null, null, null);
    }

    public int maxRowsOrDefault(int fallback) {
        return maxRows == null || maxRows <= 0 ? fallback : maxRows;
    }

    public int headerRowIndexOrDefault() {
        return headerRowIndex == null || headerRowIndex < 0 ? 0 : headerRowIndex;
    }
}
