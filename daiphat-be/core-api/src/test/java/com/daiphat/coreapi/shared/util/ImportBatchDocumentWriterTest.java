package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.lotteries.ImportBatchDocument;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileMappingRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileSupplierIdentityResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.shared.util.tabular.TabularFileParser;
import com.daiphat.coreapi.shared.util.tabular.TabularParseOptions;
import com.daiphat.coreapi.shared.util.tabular.TabularRow;
import com.daiphat.coreapi.shared.util.tabular.TabularTable;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The exported delivery note must round-trip: an operator edits it in Excel and
 * uploads it straight back, so the file this writer produces has to be a file the
 * importer can still read.
 */
class ImportBatchDocumentWriterTest {

    private final ImportBatchDocumentWriter writer = new ImportBatchDocumentWriter();
    private final TabularFileParser parser = new TabularFileParser();
    private final ImportBatchFileMappingDetector detector = new ImportBatchFileMappingDetector();
    private final SupplierIdentityScanner scanner = new SupplierIdentityScanner();

    private LotterySupplierModel minhChinh() {
        return LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chính")
                .code("MINH_CHINH")
                .taxCode("0301234567")
                .contactName("Trần Văn Bảy")
                .contactPhone("0909123456")
                .contactEmail("ncc@minhchinh.vn")
                .build();
    }

    private ImportBatchDocument.Party supplierParty() {
        return new ImportBatchDocument.Party(
                "Minh Chính", "MINH_CHINH", "0301234567", "Trần Văn Bảy",
                "0909123456", "ncc@minhchinh.vn", "25 Lê Lợi, Quận 1, TP.HCM");
    }

    private ImportBatchDocument.Party issuerParty() {
        return new ImportBatchDocument.Party(
                "CÔNG TY TNHH XỔ SỐ ĐẠI PHÁT", null, "0312345678", "Nguyễn Văn A",
                "1900 636 365", "hotro@daiphat.id.vn", "123 Lý Chính Thắng, Quận 3");
    }

    private ImportBatchDocument.StationLine station(String code, String name, int declared, int imported) {
        return new ImportBatchDocument.StationLine(
                code, name, "16/08/2026", "Thứ 2, Thứ 6 · 16:15", "Nhập mới", "Đang nhập",
                imported + "/" + declared, declared, imported,
                BigDecimal.valueOf(10000), BigDecimal.valueOf(10), BigDecimal.valueOf(9000),
                BigDecimal.valueOf(9000L * declared));
    }

    private ImportBatchDocument document(int ticketsPerStation) {
        List<ImportBatchDocument.StationLine> stations = List.of(
                station("TG", "Tiền Giang", 100, ticketsPerStation),
                station("KG", "Kiên Giang", 100, ticketsPerStation));

        List<ImportBatchDocument.TicketLine> tickets = stations.stream()
                .flatMap(line -> IntStream.range(0, ticketsPerStation)
                        .mapToObj(index -> new ImportBatchDocument.TicketLine(
                                line.stationCode(),
                                line.stationName(),
                                line.drawDate(),
                                String.format("%06d", 100000 + index),
                                line.stationCode() + String.format("%06d", 100000 + index),
                                "",
                                BigDecimal.valueOf(9000),
                                BigDecimal.valueOf(10000),
                                BigDecimal.valueOf(10))))
                .toList();

        return new ImportBatchDocument(
                new ImportBatchDocument.Header(
                        "PN-20260816-001", "16/08/2026", "Nhập mới", "Đang nhập lô",
                        "Nhập vé trong ngày", "08:30 16/08/2026", "08:00 16/08/2026", null,
                        "Giao đủ theo hợp đồng"),
                issuerParty(),
                supplierParty(),
                new ImportBatchDocument.Operator(
                        "Nguyễn Thị Hoa", "Nhân viên kho", "0912345678", "hoa@daiphat.vn"),
                new ImportBatchDocument.Totals(
                        200, ticketsPerStation * 2,
                        BigDecimal.valueOf(1_800_000), BigDecimal.valueOf(9000L * ticketsPerStation * 2),
                        stations.size()),
                stations,
                tickets);
    }

    /** Parses the workbook the way the import service does: detect, then re-parse. */
    private TabularTable parseAsService(byte[] content) {
        Map<String, List<String>> aliases = detector.defaultAliasDictionary();
        TabularTable firstPass = parser.parse(content, "phieu.xlsx", TabularParseOptions.auto());
        int headerRowIndex = detector.detectHeaderRowIndex(firstPass, aliases);
        return headerRowIndex == 0
                ? firstPass
                : parser.parse(content, "phieu.xlsx",
                        new TabularParseOptions(headerRowIndex, null, null, null));
    }

    @Test
    @DisplayName("The exported note can be uploaded straight back and mapped without help")
    void exportedNoteRoundTrips() {
        TabularTable table = parseAsService(writer.write(document(3)));

        assertThat(table.headers()).contains(
                "Mã đài", "Nhà đài", "Ngày quay", "Dãy số", "Số sê-ri",
                "Giá nhập", "Giá bán", "Hoa hồng (%)");

        ImportBatchFileMappingRequest mapping =
                detector.detect(table, detector.defaultAliasDictionary());
        assertThat(mapping.stationCodeColumn()).isEqualTo("Mã đài");
        assertThat(mapping.stationColumn()).isEqualTo("Nhà đài");
        assertThat(mapping.serialsColumn()).isEqualTo("Số sê-ri");
        assertThat(mapping.numbersColumn()).isEqualTo("Dãy số");
    }

    @Test
    @DisplayName("The letterhead identifies the supplier the batch was received from")
    void letterheadNamesTheSupplier() {
        TabularTable table = parseAsService(writer.write(document(2)));

        ImportBatchFileSupplierIdentityResponse identity =
                scanner.scan(table.preamble(), minhChinh());

        assertThat(identity.declared()).isTrue();
        assertThat(identity.mismatched()).isFalse();
        assertThat(identity.fields())
                .extracting(ImportBatchFileSupplierIdentityResponse.Field::field)
                .contains("name", "code", "taxCode", "contactPhone");
    }

    @Test
    @DisplayName("Ticket rows survive the trip and the totals row closes the table")
    void ticketRowsSurvive() {
        TabularTable table = parseAsService(writer.write(document(4)));

        List<TabularRow> ticketRows = table.rows().stream()
                .takeWhile(row -> {
                    String station = row.get("Nhà đài");
                    return station != null && !station.isBlank();
                })
                .toList();

        assertThat(ticketRows).as("4 tickets x 2 stations").hasSize(8);
        assertThat(ticketRows.getFirst().get("Mã đài")).isEqualTo("TG");
        assertThat(ticketRows.getFirst().get("Ngày quay")).isEqualTo("16/08/2026");

        // The rows after the tickets are the totals and signature block; the import
        // service stops there because they name no station.
        assertThat(table.rows().size()).isGreaterThan(ticketRows.size());
    }

    @Test
    @DisplayName("A batch with no tickets exports as a declaration that still round-trips")
    void declarationOnlyBatchRoundTrips() {
        ImportBatchDocument declarationOnly = new ImportBatchDocument(
                document(0).header(),
                issuerParty(),
                supplierParty(),
                document(0).importedBy(),
                document(0).totals(),
                document(0).stations(),
                List.of());

        TabularTable table = parseAsService(writer.write(declarationOnly));

        assertThat(table.headers()).contains("Mã đài", "Nhà đài", "Ngày quay", "Số lượng");
        ImportBatchFileMappingRequest mapping =
                detector.detect(table, detector.defaultAliasDictionary());
        assertThat(mapping.quantityColumn()).isEqualTo("Số lượng");
        assertThat(mapping.serialsColumn()).isNull();

        List<TabularRow> lines = table.rows().stream()
                .takeWhile(row -> {
                    String station = row.get("Nhà đài");
                    return station != null && !station.isBlank();
                })
                .toList();
        assertThat(lines).hasSize(2);
        assertThat(lines.getFirst().get("Số lượng")).isEqualTo("100");
    }

    @Test
    @DisplayName("Both tables and the party block are ruled on every side")
    void everyTableIsRuled() throws Exception {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(writer.write(document(2))))) {
            Sheet tickets = workbook.getSheetAt(0);
            int headerRowIndex = findHeaderRow(tickets, "Mã đài");

            for (int column = 0; column < ImportBatchDocumentWriter.TICKET_HEADERS.size(); column++) {
                assertThat(isRuled(tickets.getRow(headerRowIndex).getCell(column)))
                        .as("ticket header cell %d", column).isTrue();
                assertThat(isRuled(tickets.getRow(headerRowIndex + 1).getCell(column)))
                        .as("ticket body cell %d", column).isTrue();
            }

            // The party block: first label/value row of the letterhead.
            Row party = tickets.getRow(6);
            assertThat(party.getCell(0).getStringCellValue()).isEqualTo("Nhà cung cấp:");
            assertThat(isRuled(party.getCell(0))).isTrue();
            assertThat(isRuled(party.getCell(1))).isTrue();

            Sheet stations = workbook.getSheetAt(1);
            int stationHeader = findHeaderRow(stations, "Mã đài");
            for (int column = 0; column < ImportBatchDocumentWriter.STATION_HEADERS.size(); column++) {
                assertThat(isRuled(stations.getRow(stationHeader).getCell(column)))
                        .as("station header cell %d", column).isTrue();
                assertThat(isRuled(stations.getRow(stationHeader + 1).getCell(column)))
                        .as("station body cell %d", column).isTrue();
            }
        }
    }

    @Test
    @DisplayName("A whole-number commission prints as 10, not as the truncated-looking 10.")
    void commissionRateHasNoTrailingPoint() throws Exception {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(writer.write(document(1))))) {
            Sheet sheet = workbook.getSheetAt(0);
            int headerRowIndex = findHeaderRow(sheet, "Mã đài");
            DataFormatter formatter = new DataFormatter(new Locale("vi", "VN"));

            assertThat(formatter.formatCellValue(sheet.getRow(headerRowIndex + 1).getCell(9)))
                    .isEqualTo("10");
        }
    }

    private boolean isRuled(Cell cell) {
        if (cell == null) {
            return false;
        }
        CellStyle style = cell.getCellStyle();
        return style.getBorderTop() != BorderStyle.NONE
                && style.getBorderBottom() != BorderStyle.NONE
                && style.getBorderLeft() != BorderStyle.NONE
                && style.getBorderRight() != BorderStyle.NONE;
    }

    private int findHeaderRow(Sheet sheet, String label) {
        for (int index = 0; index <= sheet.getLastRowNum(); index++) {
            Row row = sheet.getRow(index);
            Cell cell = row == null ? null : row.getCell(1);
            if (cell != null && cell.getCellType() == CellType.STRING
                    && label.equals(cell.getStringCellValue())) {
                return index;
            }
        }
        throw new AssertionError("no header row found on sheet " + sheet.getSheetName());
    }

    @Test
    @DisplayName("The station summary lives on its own sheet, out of the importer's way")
    void stationSummaryIsOnASeparateSheet() {
        byte[] content = writer.write(document(2));

        // Sheet 1 is what the importer reads, and it carries tickets, not stations.
        TabularTable table = parseAsService(content);
        assertThat(table.headers()).contains("Số sê-ri");
        assertThat(table.headers()).doesNotContain("Lịch quay", "Tiến độ", "SL khai báo");

        assertThat(ImportBatchDocumentWriter.STATION_HEADERS)
                .contains("Lịch quay", "Loại lô", "Trạng thái nhập", "Tiến độ",
                        "SL khai báo", "SL đã nhập", "Giá bán", "Hoa hồng (%)",
                        "Giá vốn", "Tổng giá vốn");
    }
}
