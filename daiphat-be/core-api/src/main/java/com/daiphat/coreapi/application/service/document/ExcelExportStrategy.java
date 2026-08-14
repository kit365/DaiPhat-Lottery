package com.daiphat.coreapi.application.service.document;

import com.daiphat.coreapi.application.dto.document.SpreadsheetWorkbookSpec;

/** Business-specific strategy: it maps data to a portable spreadsheet specification only. */
public interface ExcelExportStrategy<T> {
    SpreadsheetWorkbookSpec workbook(T source);

    String fileName(T source);
}
