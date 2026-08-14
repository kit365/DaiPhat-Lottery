package com.daiphat.coreapi.application.dto.document;

import java.util.List;

public record SpreadsheetSheetSpec(
        String name,
        List<SpreadsheetColumnSpec> columns,
        List<List<Object>> rows,
        boolean includeHeader) {

    public SpreadsheetSheetSpec(String name, List<SpreadsheetColumnSpec> columns, List<List<Object>> rows) {
        this(name, columns, rows, true);
    }
    public SpreadsheetSheetSpec {
        columns = columns == null ? List.of() : List.copyOf(columns);
        rows = rows == null ? List.of() : rows.stream().map(List::copyOf).toList();
    }
}
