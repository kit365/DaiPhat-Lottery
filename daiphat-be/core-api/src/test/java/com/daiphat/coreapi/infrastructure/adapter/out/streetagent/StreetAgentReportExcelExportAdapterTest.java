package com.daiphat.coreapi.infrastructure.adapter.out.streetagent;

import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentReportResponse;
import com.daiphat.coreapi.application.export.streetagent.StreetAgentReportExcelExportStrategy;
import com.daiphat.coreapi.infrastructure.adapter.out.document.ApachePoiSpreadsheetRendererAdapter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StreetAgentReportExcelExportAdapterTest {

    @Test
    void exports_all_sections_to_three_sheets() throws Exception {
        var strategy = new StreetAgentReportExcelExportStrategy();
        var renderer = new ApachePoiSpreadsheetRendererAdapter();
        var overview = new StreetAgentReportResponse.Overview(
                new StreetAgentReportResponse.Period(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31), List.of("FINALIZED")),
                1, 0, 1, 0, false,
                new StreetAgentReportResponse.Summary(10, 8, 2, new BigDecimal("100000"),
                        new BigDecimal("10000"), new BigDecimal("90000"), new BigDecimal("80.00")));

        var source = new StreetAgentReportExcelExportStrategy.ReportExportSource(overview,
                List.of(new StreetAgentReportResponse.Agent(1L, "Nguyễn An", 1, 10, 8, 2,
                        new BigDecimal("100000"), new BigDecimal("10000"), new BigDecimal("90000"), new BigDecimal("80.00"))),
                List.of(new StreetAgentReportResponse.Station(2L, "Đài A", 10, 8, 2,
                        new BigDecimal("100000"), new BigDecimal("80.00"))));
        SpreadsheetDocument document = renderer.render(strategy.workbook(source), strategy.fileName(source));

        assertThat(document.fileName()).isEqualTo("bao-cao-nguoi-ban-ve-20260801-20260831.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(document.content()))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(3);
            assertThat(workbook.getSheet("Tổng quan").getRow(0).getCell(0).getStringCellValue()).isEqualTo("Từ ngày");
            assertThat(workbook.getSheet("Theo người bán").getRow(1).getCell(1).getStringCellValue()).isEqualTo("Nguyễn An");
            assertThat(workbook.getSheet("Theo đài").getRow(1).getCell(1).getStringCellValue()).isEqualTo("Đài A");
            assertThat(workbook.getSheet("Theo người bán").getRow(1).getCell(6).getCellType().name()).isEqualTo("NUMERIC");
        }
    }
}
