package com.daiphat.coreapi.application.service.document;

import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.port.out.document.SpreadsheetRendererPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SpreadsheetExportService {
    private final SpreadsheetRendererPort spreadsheetRendererPort;

    public <T> SpreadsheetDocument export(ExcelExportStrategy<T> strategy, T source) {
        return spreadsheetRendererPort.render(strategy.workbook(source), strategy.fileName(source));
    }
}
