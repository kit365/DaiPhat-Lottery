package com.daiphat.coreapi.shared.util.tabular;

import java.util.Map;

/**
 * One data row of an uploaded file.
 *
 * @param rowNumber 1-based position in the file, so the user can find the row in Excel
 * @param values    cell values keyed by both header name and positional key ("COL:0")
 */
public record TabularRow(int rowNumber, Map<String, String> values) {

    public String get(String column) {
        if (column == null) {
            return null;
        }
        String value = values.get(column);
        return value == null || value.isBlank() ? null : value.trim();
    }

    public boolean isBlank() {
        return values.values().stream().allMatch(value -> value == null || value.isBlank());
    }
}
