package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.lotteries.ImportBatchDocument;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.extensions.XSSFCellBorder;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

/**
 * Renders an {@link ImportBatchDocument} as the .xlsx a warehouse can print,
 * file, and upload straight back.
 *
 * <p>Sheet layout is load-bearing, not decoration:
 * <ul>
 *   <li>Sheet 1 "Phiếu nhập vé" is the only sheet the importer reads. It carries
 *       the letterhead, then the ticket table, then the totals and signatures.
 *   <li>Sheet 2 "Danh sách đài" carries the per-station summary. It lives on its
 *       own sheet because its header row also names Mã đài / Nhà đài / Ngày quay:
 *       put below the tickets it would be read as a second header, and put above
 *       them it would be found first and the tickets lost.
 * </ul>
 *
 * <p>The letterhead is why {@code ImportBatchFileMappingDetector} looks for the
 * header row instead of assuming row 1, and the totals row is why the import
 * service stops at the first row naming no station. Change this layout and check
 * {@code ImportBatchFileTemplateRoundTripTest} still passes.
 */
@Component
@Slf4j
public class ImportBatchDocumentWriter {

    public static final List<String> TICKET_HEADERS = List.of(
            "STT", "Mã đài", "Nhà đài", "Ngày quay", "Dãy số", "Số sê-ri", "Ảnh vé",
            "Giá nhập", "Giá bán", "Hoa hồng (%)", "Thành tiền");

    private static final int[] TICKET_WIDTHS = {6, 10, 22, 13, 12, 20, 26, 13, 13, 13, 15};

    /**
     * Shape used when the batch has no tickets yet. A declared-only batch must
     * round-trip too, and blank ticket columns would import as errors rather than
     * as the declaration it actually is.
     */
    public static final List<String> DECLARATION_HEADERS = List.of(
            "STT", "Mã đài", "Nhà đài", "Ngày quay", "Số lượng",
            "Giá nhập", "Giá bán", "Hoa hồng (%)", "Thành tiền");

    private static final int[] DECLARATION_WIDTHS = {6, 10, 22, 13, 13, 13, 13, 13, 16};

    public static final List<String> STATION_HEADERS = List.of(
            "STT", "Mã đài", "Nhà đài", "Ngày quay", "Lịch quay", "Loại lô", "Trạng thái nhập",
            "Tiến độ", "SL khai báo", "SL đã nhập", "Giá bán", "Hoa hồng (%)", "Giá vốn",
            "Tổng giá vốn");

    private static final int[] STATION_WIDTHS =
            {6, 10, 22, 13, 26, 18, 16, 12, 13, 13, 13, 13, 13, 16};

    private static final byte[] BRAND = {(byte) 0xEE, (byte) 0x13, (byte) 0x14};
    private static final byte[] ZEBRA = {(byte) 0xF8, (byte) 0xFA, (byte) 0xFC};
    private static final byte[] PARTY_BG = {(byte) 0xF1, (byte) 0xF5, (byte) 0xF9};
    private static final byte[] TOTAL_BG = {(byte) 0xFE, (byte) 0xF2, (byte) 0xF2};

    /** Slate-500: a hairline grey is lost against Excel's own gridlines in print. */
    private static final byte[] BORDER_RULE = {(byte) 0x64, (byte) 0x74, (byte) 0x8B};

    private static final String MONEY_FORMAT = "#,##0";

    /**
     * "General", not "0.##": a decimal point written in an Excel format code is
     * always printed, so "0.##" renders a whole 5% as "5." — which reads like a
     * truncated number. General shows 5 as "5" and 12.5 as "12.5".
     */
    private static final String PERCENT_FORMAT = "General";

    private static final String BLANK_LINE = "..............................";

    public byte[] write(ImportBatchDocument document) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Styles styles = new Styles(workbook);

            buildTicketSheet(workbook, styles, document);
            buildStationSheet(workbook, styles, document);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.warn("Could not render the import batch document for batch {}",
                    document.header().batchCode(), e);
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, e);
        }
    }

    // ------------------------------------------------------- ticket sheet

    private void buildTicketSheet(
            XSSFWorkbook workbook,
            Styles styles,
            ImportBatchDocument document
    ) {
        boolean carriesTickets = !document.tickets().isEmpty();
        List<String> headers = carriesTickets ? TICKET_HEADERS : DECLARATION_HEADERS;
        int[] widths = carriesTickets ? TICKET_WIDTHS : DECLARATION_WIDTHS;

        Sheet sheet = workbook.createSheet("Phiếu nhập vé");
        for (int index = 0; index < widths.length; index++) {
            sheet.setColumnWidth(index, widths[index] * 256);
        }

        int headerRow = buildLetterhead(sheet, styles, document, headers.size());
        writeHeaderRow(sheet, styles, headerRow, headers);
        sheet.createFreezePane(0, headerRow + 1);

        int rowNumber = carriesTickets
                ? writeTicketRows(sheet, styles, document, headerRow + 1)
                : writeDeclarationRows(sheet, styles, document, headerRow + 1);

        // Closes the table: naming no station is what tells the importer to stop,
        // so the signature block below is never read as ticket data.
        int lastColumn = headers.size() - 1;
        int labelSpan = Math.min(5, lastColumn - 1);
        Row totals = sheet.createRow(rowNumber++);
        sheet.addMergedRegion(
                new CellRangeAddress(totals.getRowNum(), totals.getRowNum(), 0, labelSpan));
        text(totals, 0, carriesTickets
                        ? String.format("TỔNG CỘNG: %,d tờ vé đã nhập / %,d vé khai báo",
                        document.totals().importedQuantity(), document.totals().declaredQuantity())
                        : String.format("TỔNG CỘNG: %,d vé khai báo",
                        document.totals().declaredQuantity()),
                styles.totalLeft());
        for (int column = labelSpan + 1; column < lastColumn; column++) {
            text(totals, column, "", styles.total());
        }
        money(totals, lastColumn, carriesTickets
                        ? document.totals().importedCostValue()
                        : document.totals().declaredCostValue(),
                styles.totalMoney());

        buildSignatureBlock(sheet, styles, rowNumber + 1, lastColumn);
    }

    /** @return the row index just past the last ticket written */
    private int writeTicketRows(
            Sheet sheet,
            Styles styles,
            ImportBatchDocument document,
            int firstRow
    ) {
        List<ImportBatchDocument.TicketLine> tickets = document.tickets();
        int rowNumber = firstRow;
        for (int index = 0; index < tickets.size(); index++) {
            ImportBatchDocument.TicketLine ticket = tickets.get(index);
            Row row = sheet.createRow(rowNumber++);
            boolean zebra = index % 2 == 1;

            number(row, 0, index + 1, styles.body(zebra));
            text(row, 1, ticket.stationCode(), styles.body(zebra));
            text(row, 2, ticket.stationName(), styles.bodyLeft(zebra));
            text(row, 3, ticket.drawDate(), styles.body(zebra));
            text(row, 4, ticket.numbers(), styles.body(zebra));
            text(row, 5, ticket.serialNumber(), styles.bodyLeft(zebra));
            text(row, 6, ticket.ticketImage(), styles.bodyLeft(zebra));
            money(row, 7, ticket.importCost(), styles.money(zebra));
            money(row, 8, ticket.salePrice(), styles.money(zebra));
            money(row, 9, ticket.commissionPercent(), styles.percent(zebra));
            money(row, 10, ticket.importCost(), styles.money(zebra));
        }
        return rowNumber;
    }

    /** @return the row index just past the last declaration line written */
    private int writeDeclarationRows(
            Sheet sheet,
            Styles styles,
            ImportBatchDocument document,
            int firstRow
    ) {
        List<ImportBatchDocument.StationLine> stations = document.stations();
        int rowNumber = firstRow;
        for (int index = 0; index < stations.size(); index++) {
            ImportBatchDocument.StationLine station = stations.get(index);
            Row row = sheet.createRow(rowNumber++);
            boolean zebra = index % 2 == 1;

            number(row, 0, index + 1, styles.body(zebra));
            text(row, 1, station.stationCode(), styles.body(zebra));
            text(row, 2, station.stationName(), styles.bodyLeft(zebra));
            text(row, 3, station.drawDate(), styles.body(zebra));
            number(row, 4, station.declaredQuantity(), styles.money(zebra));
            money(row, 5, station.importCost(), styles.money(zebra));
            money(row, 6, station.salePrice(), styles.money(zebra));
            money(row, 7, station.commissionPercent(), styles.percent(zebra));
            money(row, 8, station.totalCostValue(), styles.money(zebra));
        }
        return rowNumber;
    }

    // ------------------------------------------------------ station sheet

    private void buildStationSheet(
            XSSFWorkbook workbook,
            Styles styles,
            ImportBatchDocument document
    ) {
        Sheet sheet = workbook.createSheet("Danh sách đài");
        for (int index = 0; index < STATION_WIDTHS.length; index++) {
            sheet.setColumnWidth(index, STATION_WIDTHS[index] * 256);
        }

        Row title = sheet.createRow(0);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, STATION_HEADERS.size() - 1));
        text(title, 0, String.format("CÁC NHÀ ĐÀI TRONG PHIẾU %s - NGÀY QUAY %s",
                nullToDash(document.header().batchCode()), document.header().drawDate()),
                styles.documentTitle());
        title.setHeightInPoints(24);

        writeHeaderRow(sheet, styles, 2, STATION_HEADERS);
        sheet.createFreezePane(0, 3);

        List<ImportBatchDocument.StationLine> stations = document.stations();
        int rowNumber = 3;
        for (int index = 0; index < stations.size(); index++) {
            ImportBatchDocument.StationLine station = stations.get(index);
            Row row = sheet.createRow(rowNumber++);
            boolean zebra = index % 2 == 1;

            number(row, 0, index + 1, styles.body(zebra));
            text(row, 1, station.stationCode(), styles.body(zebra));
            text(row, 2, station.stationName(), styles.bodyLeft(zebra));
            text(row, 3, station.drawDate(), styles.body(zebra));
            text(row, 4, station.drawSchedule(), styles.bodyLeft(zebra));
            text(row, 5, station.batchType(), styles.body(zebra));
            text(row, 6, station.status(), styles.body(zebra));
            text(row, 7, station.progress(), styles.body(zebra));
            number(row, 8, station.declaredQuantity(), styles.money(zebra));
            number(row, 9, station.importedQuantity(), styles.money(zebra));
            money(row, 10, station.salePrice(), styles.money(zebra));
            money(row, 11, station.commissionPercent(), styles.percent(zebra));
            money(row, 12, station.importCost(), styles.money(zebra));
            money(row, 13, station.totalCostValue(), styles.money(zebra));
        }

        Row totals = sheet.createRow(rowNumber);
        sheet.addMergedRegion(new CellRangeAddress(totals.getRowNum(), totals.getRowNum(), 0, 7));
        text(totals, 0, String.format("TỔNG CỘNG %d nhà đài", document.totals().stationCount()),
                styles.totalLeft());
        for (int column = 1; column <= 7; column++) {
            text(totals, column, "", styles.total());
        }
        number(totals, 8, document.totals().declaredQuantity(), styles.totalMoney());
        number(totals, 9, document.totals().importedQuantity(), styles.totalMoney());
        text(totals, 10, "", styles.total());
        text(totals, 11, "", styles.total());
        text(totals, 12, "", styles.total());
        money(totals, 13, document.totals().declaredCostValue(), styles.totalMoney());
    }

    // --------------------------------------------------------- letterhead

    /**
     * Writes issuer, title, both parties and the operator.
     *
     * @return the 0-based row index the column headers belong on
     */
    private int buildLetterhead(
            Sheet sheet,
            Styles styles,
            ImportBatchDocument document,
            int columnCount
    ) {
        ImportBatchDocument.Header header = document.header();
        ImportBatchDocument.Party issuer = document.issuer();
        int lastColumn = columnCount - 1;
        int mid = Math.max(1, columnCount / 2);

        Row issuerRow = sheet.createRow(0);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, mid - 1));
        text(issuerRow, 0, issuer.name(), styles.issuerName());
        sheet.addMergedRegion(new CellRangeAddress(0, 0, mid, lastColumn));
        text(issuerRow, mid, "Mẫu số: 01-VT/NV", styles.mutedRight());

        Row addressRow = sheet.createRow(1);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, mid - 1));
        text(addressRow, 0, "Địa chỉ: " + nullToDash(issuer.address()), styles.muted());
        sheet.addMergedRegion(new CellRangeAddress(1, 1, mid, lastColumn));
        text(addressRow, mid, "Số phiếu: " + nullToDash(header.batchCode()), styles.mutedRight());

        Row titleRow = sheet.createRow(3);
        sheet.addMergedRegion(new CellRangeAddress(3, 3, 0, lastColumn));
        text(titleRow, 0, "PHIẾU GIAO NHẬN VÉ XỔ SỐ", styles.documentTitle());
        titleRow.setHeightInPoints(28);

        Row subtitleRow = sheet.createRow(4);
        sheet.addMergedRegion(new CellRangeAddress(4, 4, 0, lastColumn));
        text(subtitleRow, 0, String.format("Ngày quay thưởng: %s  ·  %s  ·  %s",
                header.drawDate(), nullToDash(header.batchType()), nullToDash(header.status())),
                styles.subtitle());

        // Label / value pairs. SupplierIdentityScanner reads these labels back on
        // upload to confirm the file belongs to the supplier that was selected -
        // renaming one silently turns that check off.
        List<String[]> fields = List.of(
                new String[]{"Nhà cung cấp:", document.supplier().name(),
                        "Bên nhận:", issuer.name()},
                new String[]{"Mã nhà cung cấp:", document.supplier().code(),
                        "Mã số thuế bên nhận:", issuer.taxCode()},
                new String[]{"Mã số thuế:", document.supplier().taxCode(),
                        "Ngày giờ nhập lô:", header.importedAt()},
                new String[]{"Người liên hệ:", document.supplier().contactName(),
                        "Người nhập lô:", document.importedBy().fullName()},
                new String[]{"Số điện thoại:", document.supplier().phone(),
                        "Vai trò:", document.importedBy().role()},
                new String[]{"Email:", document.supplier().email(),
                        "SĐT người nhập:", document.importedBy().phone()},
                new String[]{"Địa chỉ:", document.supplier().address(),
                        "Email người nhập:", document.importedBy().email()},
                new String[]{"Chế độ nhập:", header.importMode(),
                        "Tổng SL khai báo:", String.format("%,d vé",
                        document.totals().declaredQuantity())}
        );

        int rowIndex = 6;
        for (String[] field : fields) {
            Row row = sheet.createRow(rowIndex);
            labelValue(sheet, styles, row, 0, 1, mid - 1, field[0], field[1]);
            labelValue(sheet, styles, row, mid, mid + 1, lastColumn, field[2], field[3]);
            for (int column = 0; column <= lastColumn; column++) {
                if (row.getCell(column) == null) {
                    text(row, column, "", styles.party());
                }
            }
            row.setHeightInPoints(18);
            rowIndex++;
        }

        // rowIndex now points at the blank row after the party block.
        return rowIndex + 1;
    }

    private void labelValue(
            Sheet sheet,
            Styles styles,
            Row row,
            int labelColumn,
            int valueColumn,
            int valueEndColumn,
            String label,
            String value
    ) {
        text(row, labelColumn, label, styles.partyLabel());
        if (valueEndColumn > valueColumn) {
            sheet.addMergedRegion(new CellRangeAddress(
                    row.getRowNum(), row.getRowNum(), valueColumn, valueEndColumn));
        }
        boolean filled = value != null && !value.isBlank();
        text(row, valueColumn, filled ? value : BLANK_LINE,
                filled ? styles.party() : styles.partyEmpty());
    }

    private void buildSignatureBlock(Sheet sheet, Styles styles, int startRow, int lastColumn) {
        int third = Math.max(1, (lastColumn + 1) / 3);
        int[][] spans = {
                {0, third - 1},
                {third, 2 * third - 1},
                {2 * third, lastColumn}
        };
        String[] roles = {"NGƯỜI GIAO VÉ", "THỦ KHO NHẬN VÉ", "KẾ TOÁN"};

        Row roleRow = sheet.createRow(startRow);
        Row hintRow = sheet.createRow(startRow + 1);
        for (int index = 0; index < roles.length; index++) {
            int from = spans[index][0];
            int to = spans[index][1];
            sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, from, to));
            text(roleRow, from, roles[index], styles.signatureRole());
            sheet.addMergedRegion(new CellRangeAddress(startRow + 1, startRow + 1, from, to));
            text(hintRow, from, "(Ký, ghi rõ họ tên)", styles.signatureHint());
        }
        sheet.createRow(startRow + 2).setHeightInPoints(60);
    }

    // -------------------------------------------------------------- cells

    private void writeHeaderRow(Sheet sheet, Styles styles, int rowIndex, List<String> headers) {
        Row row = sheet.createRow(rowIndex);
        row.setHeightInPoints(30);
        for (int column = 0; column < headers.size(); column++) {
            text(row, column, headers.get(column), styles.tableHeader());
        }
    }

    private void text(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value == null ? "" : value);
        cell.setCellStyle(style);
    }

    private void number(Row row, int column, int value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    /** A missing amount is left blank rather than printed as a misleading zero. */
    private void money(Row row, int column, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value != null) {
            cell.setCellValue(value.doubleValue());
        }
        cell.setCellStyle(style);
    }

    private String nullToDash(String value) {
        return value == null || value.isBlank() ? "—" : value;
    }

    // ------------------------------------------------------------ styles

    /**
     * Styles are created once per workbook: Excel caps a file at 64k cell styles,
     * and a batch with thousands of tickets would blow past that if each cell made
     * its own.
     */
    private static final class Styles {

        private final CellStyle issuerName;
        private final CellStyle muted;
        private final CellStyle mutedRight;
        private final CellStyle documentTitle;
        private final CellStyle subtitle;
        private final CellStyle partyLabel;
        private final CellStyle party;
        private final CellStyle partyEmpty;
        private final CellStyle tableHeader;
        private final CellStyle[] body = new CellStyle[2];
        private final CellStyle[] bodyLeft = new CellStyle[2];
        private final CellStyle[] money = new CellStyle[2];
        private final CellStyle[] percent = new CellStyle[2];
        private final CellStyle total;
        private final CellStyle totalLeft;
        private final CellStyle totalMoney;
        private final CellStyle signatureRole;
        private final CellStyle signatureHint;

        private Styles(XSSFWorkbook workbook) {
            Font brandFont = workbook.createFont();
            brandFont.setBold(true);
            brandFont.setFontHeightInPoints((short) 12);
            ((org.apache.poi.xssf.usermodel.XSSFFont) brandFont).setColor(color(BRAND));

            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);

            Font mutedFont = workbook.createFont();
            mutedFont.setFontHeightInPoints((short) 10);
            mutedFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            Font italicFont = workbook.createFont();
            italicFont.setItalic(true);
            italicFont.setFontHeightInPoints((short) 11);
            italicFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            Font boldFont = workbook.createFont();
            boldFont.setBold(true);
            boldFont.setFontHeightInPoints((short) 10);

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            Font bodyFont = workbook.createFont();
            bodyFont.setFontHeightInPoints((short) 10);

            issuerName = base(workbook, brandFont, HorizontalAlignment.LEFT, null, false, null);
            muted = base(workbook, mutedFont, HorizontalAlignment.LEFT, null, false, null);
            mutedRight = base(workbook, mutedFont, HorizontalAlignment.RIGHT, null, false, null);
            documentTitle = base(workbook, titleFont, HorizontalAlignment.CENTER, null, false, null);
            subtitle = base(workbook, italicFont, HorizontalAlignment.CENTER, null, false, null);
            // Boxed like the party block of a printed delivery note, so the two
            // sides read as two columns of a form rather than as floating text.
            partyLabel = base(workbook, boldFont, HorizontalAlignment.LEFT, PARTY_BG, true, null);
            party = base(workbook, bodyFont, HorizontalAlignment.LEFT, PARTY_BG, true, null);
            partyEmpty = base(workbook, mutedFont, HorizontalAlignment.LEFT, PARTY_BG, true, null);
            tableHeader = base(workbook, headerFont, HorizontalAlignment.CENTER, BRAND, true, null);
            tableHeader.setWrapText(true);

            for (int index = 0; index < 2; index++) {
                byte[] fill = index == 1 ? ZEBRA : null;
                body[index] = base(workbook, bodyFont, HorizontalAlignment.CENTER, fill, true, null);
                bodyLeft[index] = base(workbook, bodyFont, HorizontalAlignment.LEFT, fill, true, null);
                money[index] = base(workbook, bodyFont, HorizontalAlignment.RIGHT, fill, true,
                        MONEY_FORMAT);
                percent[index] = base(workbook, bodyFont, HorizontalAlignment.RIGHT, fill, true,
                        PERCENT_FORMAT);
            }

            total = base(workbook, boldFont, HorizontalAlignment.CENTER, TOTAL_BG, true, null);
            totalLeft = base(workbook, boldFont, HorizontalAlignment.LEFT, TOTAL_BG, true, null);
            totalMoney = base(workbook, boldFont, HorizontalAlignment.RIGHT, TOTAL_BG, true,
                    MONEY_FORMAT);
            signatureRole = base(workbook, boldFont, HorizontalAlignment.CENTER, null, false, null);
            signatureHint = base(workbook, italicFont, HorizontalAlignment.CENTER, null, false, null);
        }

        private static XSSFColor color(byte[] rgb) {
            return new XSSFColor(rgb, null);
        }

        private static CellStyle base(
                XSSFWorkbook workbook,
                Font font,
                HorizontalAlignment alignment,
                byte[] fill,
                boolean bordered,
                String dataFormat
        ) {
            XSSFCellStyle style = workbook.createCellStyle();
            style.setFont(font);
            style.setAlignment(alignment);
            style.setVerticalAlignment(VerticalAlignment.CENTER);
            if (fill != null) {
                style.setFillForegroundColor(color(fill));
                style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }
            if (bordered) {
                style.setBorderTop(BorderStyle.THIN);
                style.setBorderBottom(BorderStyle.THIN);
                style.setBorderLeft(BorderStyle.THIN);
                style.setBorderRight(BorderStyle.THIN);
                // Same slate rule the downloadable template draws, so an exported
                // batch and a blank form look like the same document.
                XSSFColor rule = color(BORDER_RULE);
                style.setBorderColor(XSSFCellBorder.BorderSide.TOP, rule);
                style.setBorderColor(XSSFCellBorder.BorderSide.BOTTOM, rule);
                style.setBorderColor(XSSFCellBorder.BorderSide.LEFT, rule);
                style.setBorderColor(XSSFCellBorder.BorderSide.RIGHT, rule);
            }
            if (dataFormat != null) {
                style.setDataFormat(workbook.createDataFormat().getFormat(dataFormat));
            }
            return style;
        }

        private CellStyle issuerName() {
            return issuerName;
        }

        private CellStyle muted() {
            return muted;
        }

        private CellStyle mutedRight() {
            return mutedRight;
        }

        private CellStyle documentTitle() {
            return documentTitle;
        }

        private CellStyle subtitle() {
            return subtitle;
        }

        private CellStyle partyLabel() {
            return partyLabel;
        }

        private CellStyle party() {
            return party;
        }

        private CellStyle partyEmpty() {
            return partyEmpty;
        }

        private CellStyle tableHeader() {
            return tableHeader;
        }

        private CellStyle body(boolean zebra) {
            return body[zebra ? 1 : 0];
        }

        private CellStyle bodyLeft(boolean zebra) {
            return bodyLeft[zebra ? 1 : 0];
        }

        private CellStyle money(boolean zebra) {
            return money[zebra ? 1 : 0];
        }

        private CellStyle percent(boolean zebra) {
            return percent[zebra ? 1 : 0];
        }

        private CellStyle total() {
            return total;
        }

        private CellStyle totalLeft() {
            return totalLeft;
        }

        private CellStyle totalMoney() {
            return totalMoney;
        }

        private CellStyle signatureRole() {
            return signatureRole;
        }

        private CellStyle signatureHint() {
            return signatureHint;
        }
    }
}
