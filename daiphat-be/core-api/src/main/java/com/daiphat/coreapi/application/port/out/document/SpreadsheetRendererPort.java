package com.daiphat.coreapi.application.port.out.document;

import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.dto.document.SpreadsheetWorkbookSpec;

public interface SpreadsheetRendererPort {
    SpreadsheetDocument render(SpreadsheetWorkbookSpec workbook, String fileName);
}
