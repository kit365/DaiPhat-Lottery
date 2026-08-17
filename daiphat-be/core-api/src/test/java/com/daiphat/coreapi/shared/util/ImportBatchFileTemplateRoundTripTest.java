package com.daiphat.coreapi.shared.util;

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
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Reads the file the frontend's "Mẫu nhập vé chi tiết" button produces.
 *
 * <p>The fixture is a real download of that template, so this test fails if the
 * generator and the reader ever drift apart - the template is only useful while
 * the system can still read what it wrote. Regenerate it from
 * {@code importBatchFileTemplate.ts} when the layout changes on purpose.
 */
class ImportBatchFileTemplateRoundTripTest {

    private static final String FIXTURE = "/import-batch/phieu-nhap-ve-mau.xlsx";

    /** The "Mẫu hôm qua + hôm nay" download: two draw dates in one document. */
    private static final String TWO_DAY_FIXTURE = "/import-batch/phieu-nhap-ve-hai-ngay.xlsx";

    private final TabularFileParser parser = new TabularFileParser();
    private final ImportBatchFileMappingDetector detector = new ImportBatchFileMappingDetector();
    private final SupplierIdentityScanner scanner = new SupplierIdentityScanner();

    private byte[] fixture() throws IOException {
        return fixture(FIXTURE);
    }

    private byte[] fixture(String path) throws IOException {
        try (InputStream stream = getClass().getResourceAsStream(path)) {
            assertThat(stream).as("template fixture on the test classpath").isNotNull();
            return stream.readAllBytes();
        }
    }

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

    /** Parses the fixture the way the import service does: detect, then re-parse. */
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
    @DisplayName("The column headers are found below the letterhead, not on the first row")
    void findsHeaderRowBelowLetterhead() throws IOException {
        byte[] content = fixture();
        TabularTable firstPass = parser.parse(content, "phieu.xlsx", TabularParseOptions.auto());

        // Taken at face value the first row is the company name, not a header.
        assertThat(firstPass.headers().getFirst()).contains("ĐẠI PHÁT");

        int headerRowIndex = detector.detectHeaderRowIndex(
                firstPass, detector.defaultAliasDictionary());
        assertThat(headerRowIndex).isGreaterThan(0);

        TabularTable table = parseAsService(content);
        assertThat(table.headers())
                .contains("Mã đài", "Nhà đài", "Ngày quay", "Dãy số", "Số sê-ri",
                        "Giá nhập", "Giá bán", "Hoa hồng (%)");
    }

    @Test
    @DisplayName("Every ticket column maps itself, so the file needs no manual mapping")
    void autoDetectsEveryColumn() throws IOException {
        TabularTable table = parseAsService(fixture());
        ImportBatchFileMappingRequest mapping =
                detector.detect(table, detector.defaultAliasDictionary());

        assertThat(mapping.stationCodeColumn()).isEqualTo("Mã đài");
        assertThat(mapping.stationColumn()).isEqualTo("Nhà đài");
        assertThat(mapping.drawDateColumn()).isEqualTo("Ngày quay");
        assertThat(mapping.numbersColumn()).isEqualTo("Dãy số");
        assertThat(mapping.serialsColumn()).isEqualTo("Số sê-ri");
        assertThat(mapping.importCostColumn()).isEqualTo("Giá nhập");
        assertThat(mapping.salePriceColumn()).isEqualTo("Giá bán");
        assertThat(mapping.commissionRateColumn()).isEqualTo("Hoa hồng (%)");
    }

    @Test
    @DisplayName("The letterhead identifies the supplier the template was issued for")
    void readsSupplierFromLetterhead() throws IOException {
        TabularTable table = parseAsService(fixture());

        ImportBatchFileSupplierIdentityResponse identity =
                scanner.scan(table.preamble(), minhChinh());

        assertThat(identity.declared()).isTrue();
        assertThat(identity.mismatched()).isFalse();
        assertThat(identity.fields())
                .extracting(ImportBatchFileSupplierIdentityResponse.Field::field)
                .contains("name", "code", "taxCode", "contactPhone");
    }

    @Test
    @DisplayName("The same file uploaded against a different supplier is rejected")
    void rejectsWhenSupplierDiffers() throws IOException {
        TabularTable table = parseAsService(fixture());

        ImportBatchFileSupplierIdentityResponse identity = scanner.scan(
                table.preamble(),
                LotterySupplierModel.builder()
                        .id(2L)
                        .name("Thành Đạt")
                        .code("THANH_DAT")
                        .taxCode("0399999999")
                        .contactPhone("0911222333")
                        .build());

        assertThat(identity.mismatched()).isTrue();
    }

    @Test
    @DisplayName("300 ticket rows are carried: 100 physical tickets for each of 3 stations")
    void carriesOneHundredTicketsPerStation() throws IOException {
        TabularTable table = parseAsService(fixture());

        List<TabularRow> ticketRows = table.rows().stream()
                .filter(row -> {
                    String station = row.get("Nhà đài");
                    return station != null && !station.isBlank();
                })
                .toList();

        assertThat(ticketRows).hasSize(300);
        assertThat(ticketRows.stream().map(row -> row.get("Nhà đài")).distinct())
                .containsExactlyInAnyOrder("Tiền Giang", "Kiên Giang", "Đà Lạt");
        assertThat(ticketRows.stream().map(row -> row.get("Số sê-ri")).distinct().count())
                .as("serials must be unique across the whole file")
                .isEqualTo(300);
    }

    @Test
    @DisplayName("Every cell of the ticket table is ruled, so the printed note reads as a table")
    void ticketTableIsRuled() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(fixture()))) {
            Sheet sheet = workbook.getSheetAt(0);
            int headerRowIndex = findHeaderRow(sheet);

            Row header = sheet.getRow(headerRowIndex);
            Row firstTicket = sheet.getRow(headerRowIndex + 1);
            for (int column = 0; column < 10; column++) {
                assertThat(isRuled(header.getCell(column)))
                        .as("header cell %d is ruled", column).isTrue();
                assertThat(isRuled(firstTicket.getCell(column)))
                        .as("ticket cell %d is ruled", column).isTrue();
            }
        }
    }

    @Test
    @DisplayName("The party block is boxed too, not left as floating text")
    void partyBlockIsRuled() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(fixture()))) {
            Sheet sheet = workbook.getSheetAt(0);
            // Row 7 in 1-based terms is the first label/value row of the block.
            Row firstParty = sheet.getRow(6);

            assertThat(firstParty.getCell(0).getStringCellValue()).isEqualTo("Nhà cung cấp:");
            assertThat(isRuled(firstParty.getCell(0))).isTrue();
            assertThat(isRuled(firstParty.getCell(1))).isTrue();
        }
    }

    @Test
    @DisplayName("A whole-number commission prints as 5, not as the truncated-looking 5.")
    void commissionRateHasNoTrailingPoint() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(fixture()))) {
            Sheet sheet = workbook.getSheetAt(0);
            int headerRowIndex = findHeaderRow(sheet);
            DataFormatter formatter = new DataFormatter(new Locale("vi", "VN"));

            // Kiên Giang is seeded at 5%, the case that exposed the format bug.
            String rendered = null;
            for (int index = headerRowIndex + 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                Cell station = row == null ? null : row.getCell(1);
                if (station != null && "KG".equals(station.getStringCellValue())) {
                    // Hoa hồng (%) is the 9th column now that Thành tiền is gone
                    // and Giá nhập closes the row: 0-based index 8.
                    rendered = formatter.formatCellValue(row.getCell(8));
                    break;
                }
            }

            assertThat(rendered).isEqualTo("5");
        }
    }

    @Test
    @DisplayName("The blank template names no operator - there is nobody to name yet")
    void blankTemplateOmitsTheOperatorFields() throws IOException {
        TabularTable table = parseAsService(fixture());

        List<String> labels = table.preamble().stream()
                .flatMap(List::stream)
                .filter(cell -> cell != null && !cell.isBlank())
                .toList();

        assertThat(labels).doesNotContain(
                "Người nhập lô:", "SĐT người nhập:", "Email người nhập:");
        // The supplier side is untouched: those fields are what the upload check reads.
        assertThat(labels).contains("Nhà cung cấp:", "Mã số thuế:", "Số điện thoại:");
    }

    /** True when the cell carries a rule on all four sides. */
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

    /** 0-based index of the row carrying the column labels. */
    private int findHeaderRow(Sheet sheet) {
        for (int index = 0; index <= sheet.getLastRowNum(); index++) {
            Row row = sheet.getRow(index);
            Cell cell = row == null ? null : row.getCell(1);
            if (cell != null && cell.getCellType() == CellType.STRING
                    && "Mã đài".equals(cell.getStringCellValue())) {
                return index;
            }
        }
        throw new AssertionError("no header row found in the template");
    }

    @Test
    @DisplayName("The two-day template splits into two draw dates without reusing a serial")
    void twoDayTemplateKeepsSerialsUnique() throws IOException {
        TabularTable table = parseAsService(fixture(TWO_DAY_FIXTURE));

        List<TabularRow> ticketRows = table.rows().stream()
                .filter(row -> {
                    String station = row.get("Nhà đài");
                    return station != null && !station.isBlank();
                })
                .toList();

        assertThat(ticketRows).as("100 tickets x 3 stations x 2 draw dates").hasSize(600);
        assertThat(ticketRows.stream().map(row -> row.get("Ngày quay")).distinct())
                .containsExactlyInAnyOrder("15/08/2026", "16/08/2026");

        // A station drawing on both dates must not print the same serial twice:
        // ticket creation rejects a repeated serial, so the second day would fail.
        assertThat(ticketRows.stream().map(row -> row.get("Số sê-ri")).distinct().count())
                .as("serials must stay unique across draw dates")
                .isEqualTo(600);

        assertThat(ticketRows.stream()
                .filter(row -> "15/08/2026".equals(row.get("Ngày quay")))
                .count())
                .isEqualTo(300);
    }

    @Test
    @DisplayName("The two-day template is still read as one supplier's document")
    void twoDayTemplateKeepsLetterhead() throws IOException {
        TabularTable table = parseAsService(fixture(TWO_DAY_FIXTURE));

        assertThat(table.headers()).contains("Nhà đài", "Ngày quay", "Số sê-ri");

        ImportBatchFileSupplierIdentityResponse identity =
                scanner.scan(table.preamble(), minhChinh());
        assertThat(identity.declared()).isTrue();
        assertThat(identity.mismatched()).isFalse();
    }

    @Test
    @DisplayName("The totals and signature block below the table is not read as ticket data")
    void stopsAtTheTrailerBlock() throws IOException {
        TabularTable table = parseAsService(fixture());

        // The trailer is present in the file...
        assertThat(table.rows().stream()
                .flatMap(row -> row.values().values().stream())
                .anyMatch(value -> value != null && value.contains("TỔNG CỘNG")))
                .isTrue();

        // ...but it names no station, which is how the import service knows the
        // table has ended and stops reading.
        long rowsBeforeFirstStationlessRow = table.rows().stream()
                .takeWhile(row -> {
                    String station = row.get("Nhà đài");
                    String code = row.get("Mã đài");
                    return (station != null && !station.isBlank())
                            || (code != null && !code.isBlank());
                })
                .count();
        assertThat(rowsBeforeFirstStationlessRow).isEqualTo(300);
    }
}
