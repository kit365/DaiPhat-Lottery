package com.daiphat.coreapi.infrastructure.adapter.out.document;

import com.daiphat.coreapi.application.dto.document.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ApachePoiSpreadsheetRendererAdapterTest {

    @Test
    void renders_numeric_date_currency_and_percent_using_declared_formats() throws Exception {
        SpreadsheetSheetSpec sheet = new SpreadsheetSheetSpec(
                "Data",
                List.of(
                        new SpreadsheetColumnSpec("Ngày", 4000, SpreadsheetValueFormat.DATE),
                        new SpreadsheetColumnSpec("Tiền", 4000, SpreadsheetValueFormat.MONEY),
                        new SpreadsheetColumnSpec("Tỷ lệ", 4000, SpreadsheetValueFormat.PERCENT)),
                List.of(List.of(LocalDate.of(2026, 8, 13), new BigDecimal("10000.50"), new BigDecimal("0.25"))));
        SpreadsheetWorkbookSpec spec = new SpreadsheetWorkbookSpec(List.of(sheet));

        SpreadsheetDocument document = new ApachePoiSpreadsheetRendererAdapter().render(spec, "unsafe / export");

        assertThat(document.fileName()).isEqualTo("unsafe---export.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(document.content()))) {
            var row = workbook.getSheet("Data").getRow(1);
            assertThat(row.getCell(0).getCellStyle().getDataFormatString()).isEqualTo("dd/MM/yyyy");
            assertThat(row.getCell(1).getCellType().name()).isEqualTo("NUMERIC");
            assertThat(row.getCell(1).getCellStyle().getDataFormatString()).contains("₫");
            assertThat(row.getCell(2).getCellStyle().getDataFormatString()).isEqualTo("0.00%");
        }
    }
}
