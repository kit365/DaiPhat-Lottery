package com.daiphat.coreapi.application.dto.document;

/** A stable declared width avoids costly auto-size work for large exports. */
public record SpreadsheetColumnSpec(String header, int width, SpreadsheetValueFormat format) {
    public SpreadsheetColumnSpec {
        if (width <= 0) {
            throw new IllegalArgumentException("Spreadsheet column width must be positive");
        }
        format = format == null ? SpreadsheetValueFormat.TEXT : format;
    }
}
