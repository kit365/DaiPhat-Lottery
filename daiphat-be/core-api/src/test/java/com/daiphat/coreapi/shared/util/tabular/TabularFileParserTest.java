package com.daiphat.coreapi.shared.util.tabular;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TabularFileParserTest {

    private final TabularFileParser parser = new TabularFileParser();

    @Test
    @DisplayName("A comma-delimited UTF-8 file is read with headers and rows")
    void parse_commaDelimitedCsv() {
        String csv = """
                Ngày quay,Nhà đài,Số lượng
                12/08/2026,Tiền Giang,120
                12/08/2026,Kiên Giang,150
                """;

        TabularTable table = parser.parse(csv.getBytes(StandardCharsets.UTF_8), "ke-khai.csv", TabularParseOptions.auto());

        assertThat(table.headers()).containsExactly("Ngày quay", "Nhà đài", "Số lượng");
        assertThat(table.rows()).hasSize(2);
        assertThat(table.rows().getFirst().get("Nhà đài")).isEqualTo("Tiền Giang");
        assertThat(table.rows().getFirst().get("Số lượng")).isEqualTo("120");
        assertThat(table.appliedDelimiter()).isEqualTo(",");
    }

    @Test
    @DisplayName("Semicolon delimiters from Vietnamese-locale Excel are detected")
    void parse_semicolonDelimitedCsv() {
        String csv = """
                Ngày quay;Nhà đài;Số lượng
                12/08/2026;Tiền Giang;120
                """;

        TabularTable table = parser.parse(csv.getBytes(StandardCharsets.UTF_8), "ke-khai.csv", TabularParseOptions.auto());

        assertThat(table.appliedDelimiter()).isEqualTo(";");
        assertThat(table.headers()).containsExactly("Ngày quay", "Nhà đài", "Số lượng");
        assertThat(table.rows().getFirst().get("Nhà đài")).isEqualTo("Tiền Giang");
    }

    @Test
    @DisplayName("A UTF-8 BOM does not leak into the first header")
    void parse_stripsUtf8Bom() {
        byte[] bom = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] body = "Nhà đài,Số lượng\nTiền Giang,120\n".getBytes(StandardCharsets.UTF_8);
        byte[] content = new byte[bom.length + body.length];
        System.arraycopy(bom, 0, content, 0, bom.length);
        System.arraycopy(body, 0, content, bom.length, body.length);

        TabularTable table = parser.parse(content, "ke-khai.csv", TabularParseOptions.auto());

        assertThat(table.headers()).containsExactly("Nhà đài", "Số lượng");
    }

    @Test
    @DisplayName("A non-UTF-8 legacy export still decodes instead of failing")
    void parse_fallsBackToLegacyCharset() {
        Charset legacy = Charset.forName("windows-1258");
        // 0xEC opens a 3-byte UTF-8 sequence; followed by a space it cannot be
        // UTF-8, which is exactly how a plain-CSV export from Vietnamese Excel looks.
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        buffer.writeBytes("Nha dai,So luong\n".getBytes(StandardCharsets.US_ASCII));
        buffer.write(0xEC);
        buffer.writeBytes(" Giang,120\n".getBytes(StandardCharsets.US_ASCII));

        TabularTable table = parser.parse(buffer.toByteArray(), "ke-khai.csv", TabularParseOptions.auto());

        assertThat(table.appliedCharset()).isEqualTo(legacy.name());
        assertThat(table.headers()).containsExactly("Nha dai", "So luong");
        assertThat(table.rows()).hasSize(1);
        assertThat(table.rows().getFirst().get("Nha dai")).endsWith(" Giang");
        assertThat(table.rows().getFirst().get("So luong")).isEqualTo("120");
    }

    @Test
    @DisplayName("Blank padding rows are skipped and row numbers still point at the file")
    void parse_skipsBlankRows() {
        String csv = "Nhà đài,Số lượng\nTiền Giang,120\n\nKiên Giang,150\n";

        TabularTable table = parser.parse(csv.getBytes(StandardCharsets.UTF_8), "ke-khai.csv", TabularParseOptions.auto());

        assertThat(table.rows()).hasSize(2);
        assertThat(table.rows().get(1).get("Nhà đài")).isEqualTo("Kiên Giang");
    }

    @Test
    @DisplayName("A header row lower down the sheet can be selected explicitly")
    void parse_honoursHeaderRowIndex() {
        String csv = """
                BẢNG KÊ GIAO VÉ
                Nhà đài,Số lượng
                Tiền Giang,120
                """;

        TabularTable table = parser.parse(
                csv.getBytes(StandardCharsets.UTF_8),
                "ke-khai.csv",
                new TabularParseOptions(1, null, null)
        );

        assertThat(table.headers()).containsExactly("Nhà đài", "Số lượng");
        assertThat(table.rows()).hasSize(1);
    }

    @Test
    @DisplayName("Duplicate header labels get a numeric suffix so they stay addressable")
    void parse_dedupesHeaders() {
        String csv = "Số lượng,Số lượng\n120,130\n";

        TabularTable table = parser.parse(csv.getBytes(StandardCharsets.UTF_8), "ke-khai.csv", TabularParseOptions.auto());

        assertThat(table.headers()).containsExactly("Số lượng", "Số lượng (2)");
        assertThat(table.rows().getFirst().get("Số lượng (2)")).isEqualTo("130");
    }

    @Test
    @DisplayName("Cells are also addressable by position for headerless files")
    void parse_exposesPositionalKeys() {
        String csv = "Nhà đài,Số lượng\nTiền Giang,120\n";

        TabularTable table = parser.parse(csv.getBytes(StandardCharsets.UTF_8), "ke-khai.csv", TabularParseOptions.auto());

        assertThat(table.rows().getFirst().get(TabularTable.positionalKey(1))).isEqualTo("120");
        assertThat(table.hasColumn("COL:0")).isTrue();
    }

    @Test
    @DisplayName("An .xlsx upload is read, with date cells handed over as ISO text")
    void parse_readsXlsx() throws IOException {
        byte[] content = buildWorkbook();

        TabularTable table = parser.parse(content, "ke-khai.xlsx", TabularParseOptions.auto());

        assertThat(table.headers()).containsExactly("Ngày quay", "Nhà đài", "Số lượng");
        assertThat(table.rows()).hasSize(1);
        assertThat(table.rows().getFirst().get("Ngày quay")).isEqualTo("2026-08-12");
        assertThat(table.rows().getFirst().get("Số lượng")).isEqualTo("120");
    }

    @Test
    @DisplayName("Unsupported extensions are rejected up front")
    void parse_rejectsUnsupportedExtension() {
        assertThatThrownBy(() -> parser.parse("x".getBytes(StandardCharsets.UTF_8), "ke-khai.pdf", TabularParseOptions.auto()))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_FILE_UNSUPPORTED_FORMAT);
    }

    @Test
    @DisplayName("An empty upload is rejected")
    void parse_rejectsEmptyFile() {
        assertThatThrownBy(() -> parser.parse(new byte[0], "ke-khai.csv", TabularParseOptions.auto()))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_FILE_REQUIRED);
    }

    private byte[] buildWorkbook() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Bảng kê");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Ngày quay");
            header.createCell(1).setCellValue("Nhà đài");
            header.createCell(2).setCellValue("Số lượng");

            var dateStyle = workbook.createCellStyle();
            dateStyle.setDataFormat(workbook.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));

            Row row = sheet.createRow(1);
            var dateCell = row.createCell(0);
            dateCell.setCellValue(java.time.LocalDate.of(2026, 8, 12));
            dateCell.setCellStyle(dateStyle);
            row.createCell(1).setCellValue("Tiền Giang");
            row.createCell(2).setCellValue(120);

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
