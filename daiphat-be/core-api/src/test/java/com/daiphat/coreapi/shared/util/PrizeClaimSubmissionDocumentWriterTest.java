package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.lotteries.PrizeClaimSubmissionDocument;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PrizeClaimSubmissionDocumentWriterTest {

    private final PrizeClaimSubmissionDocumentWriter writer = new PrizeClaimSubmissionDocumentWriter();
    private final DataFormatter formatter = new DataFormatter();

    @Test
    void write_producesReadableWorkbookWithExpectedSheetsAndHeaders() throws Exception {
        byte[] content = writer.write(sampleDocument());

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(2);
            assertThat(workbook.getSheetName(0)).isEqualTo("Phiếu nộp vé trúng");
            assertThat(workbook.getSheetName(1)).isEqualTo("Tổng hợp theo đài");

            Sheet ticketSheet = workbook.getSheetAt(0);
            assertThat(findCellText(ticketSheet, 3, 0)).contains("PHIẾU NỘP VÉ TRÚNG THƯỞNG");

            int headerRowIndex = findHeaderRow(ticketSheet, "STT");
            Row headerRow = ticketSheet.getRow(headerRowIndex);
            assertThat(formatter.formatCellValue(headerRow.getCell(5))).isEqualTo("Số sê-ri");
            assertThat(formatter.formatCellValue(headerRow.getCell(9))).isEqualTo("Tạm tính");

            int firstDataRow = headerRowIndex + 1;
            assertThat(formatter.formatCellValue(ticketSheet.getRow(firstDataRow).getCell(5)))
                    .isEqualTo("TG123456");

            Sheet stationSheet = workbook.getSheetAt(1);
            int stationHeaderRow = findHeaderRow(stationSheet, "STT");
            assertThat(formatter.formatCellValue(stationSheet.getRow(stationHeaderRow).getCell(3)))
                    .isEqualTo("Số vé");
        }
    }

    private PrizeClaimSubmissionDocument sampleDocument() {
        return new PrizeClaimSubmissionDocument(
                new PrizeClaimSubmissionDocument.Header(
                        "PCS-20260901-ABC123",
                        "01/09/2026",
                        "Chờ bàn giao",
                        "Đại lý mang trả NCC",
                        "REF-001",
                        "Giao tại kho",
                        "01/09/2026 10:00",
                        null,
                        "01/09/2026 09:00"
                ),
                new PrizeClaimSubmissionDocument.Party(
                        "CÔNG TY TNHH XỔ SỐ ĐẠI PHÁT",
                        null,
                        "0312345678",
                        "Nguyễn Văn A",
                        "1900 636 365",
                        "hotro@daiphat.id.vn",
                        "123 Lý Chính Thắng"
                ),
                new PrizeClaimSubmissionDocument.Party(
                        "Gom chung (mọi đài)",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ),
                new PrizeClaimSubmissionDocument.Operator(
                        "Nguyễn Thị Hoa", "Nhân viên", "0912345678", "hoa@daiphat.vn"),
                new PrizeClaimSubmissionDocument.Operator(null, null, null, null),
                new PrizeClaimSubmissionDocument.Totals(
                        1,
                        BigDecimal.valueOf(1_000_000),
                        BigDecimal.valueOf(100_000),
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(900_000),
                        1
                ),
                List.of(new PrizeClaimSubmissionDocument.TicketLine(
                        "TG",
                        "Tiền Giang",
                        "01/09/2026",
                        "123456",
                        "TG123456",
                        "Giải nhất",
                        BigDecimal.valueOf(1_000_000),
                        BigDecimal.valueOf(100_000),
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(900_000)
                )),
                List.of(new PrizeClaimSubmissionDocument.StationSummary(
                        "TG",
                        "Tiền Giang",
                        1,
                        BigDecimal.valueOf(1_000_000),
                        BigDecimal.valueOf(100_000),
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(900_000)
                ))
        );
    }

    private String findCellText(Sheet sheet, int rowIndex, int columnIndex) {
        Row row = sheet.getRow(rowIndex);
        if (row == null || row.getCell(columnIndex) == null) {
            return "";
        }
        return formatter.formatCellValue(row.getCell(columnIndex));
    }

    private int findHeaderRow(Sheet sheet, String firstHeader) {
        for (int rowIndex = 0; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row != null && row.getCell(0) != null
                    && firstHeader.equals(formatter.formatCellValue(row.getCell(0)))) {
                return rowIndex;
            }
        }
        throw new AssertionError("Header row not found for " + firstHeader);
    }
}
