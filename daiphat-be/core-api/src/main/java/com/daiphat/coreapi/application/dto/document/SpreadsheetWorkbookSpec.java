package com.daiphat.coreapi.application.dto.document;

import java.util.List;

public record SpreadsheetWorkbookSpec(List<SpreadsheetSheetSpec> sheets) {
    public SpreadsheetWorkbookSpec {
        sheets = sheets == null ? List.of() : List.copyOf(sheets);
        if (sheets.isEmpty()) {
            throw new IllegalArgumentException("A spreadsheet must contain at least one sheet");
        }
    }
}
