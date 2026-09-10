package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.lotteries.PrizeClaimSubmissionDocument;
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
 * Renders a {@link PrizeClaimSubmissionDocument} as the .xlsx a warehouse can
 * print and hand to the supplier when submitting winning tickets.
 */
@Component
@Slf4j
public class PrizeClaimSubmissionDocumentWriter {

    public static final List<String> TICKET_HEADERS = List.of(
            "STT", "Mã đài", "Nhà đài", "Ngày quay", "Dãy số", "Số sê-ri", "Giải",
            "Tiền thưởng", "Thuế TNCN", "Tạm tính");

    private static final int[] TICKET_WIDTHS = {6, 10, 22, 13, 12, 20, 18, 14, 13, 14};

    public static final List<String> STATION_HEADERS = List.of(
            "STT", "Mã đài", "Nhà đài", "Số vé", "Tổng thưởng", "Tổng thuế",
            "Tổng tạm tính");

    private static final int[] STATION_WIDTHS = {6, 10, 22, 10, 16, 14, 16};

    private static final byte[] BRAND = {(byte) 0xEE, (byte) 0x13, (byte) 0x14};
    private static final byte[] ZEBRA = {(byte) 0xF8, (byte) 0xFA, (byte) 0xFC};
    private static final byte[] PARTY_BG = {(byte) 0xF1, (byte) 0xF5, (byte) 0xF9};
    private static final byte[] TOTAL_BG = {(byte) 0xFE, (byte) 0xF2, (byte) 0xF2};
    private static final byte[] BORDER_RULE = {(byte) 0x64, (byte) 0x74, (byte) 0x8B};

    private static final String MONEY_FORMAT = "#,##0";
    private static final String BLANK_LINE = "..............................";

    public byte[] write(PrizeClaimSubmissionDocument document) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Styles styles = new Styles(workbook);

            buildTicketSheet(workbook, styles, document);
            buildStationSheet(workbook, styles, document);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.warn("Could not render the prize claim submission document for {}",
                    document.header().submissionCode(), e);
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, e);
        }
    }

    private void buildTicketSheet(
            XSSFWorkbook workbook,
            Styles styles,
            PrizeClaimSubmissionDocument document
    ) {
        Sheet sheet = workbook.createSheet("Phiếu nộp vé trúng");
        for (int index = 0; index < TICKET_WIDTHS.length; index++) {
            sheet.setColumnWidth(index, TICKET_WIDTHS[index] * 256);
        }

        int headerRow = buildLetterhead(sheet, styles, document, TICKET_HEADERS.size());
        writeHeaderRow(sheet, styles, headerRow, TICKET_HEADERS);
        sheet.createFreezePane(0, headerRow + 1);

        int rowNumber = writeTicketRows(sheet, styles, document, headerRow + 1);

        int lastColumn = TICKET_HEADERS.size() - 1;
        int labelSpan = 6;
        Row totals = sheet.createRow(rowNumber++);
        sheet.addMergedRegion(
                new CellRangeAddress(totals.getRowNum(), totals.getRowNum(), 0, labelSpan));
        text(totals, 0,
                String.format("TỔNG CỘNG: %,d vé", document.totals().ticketCount()),
                styles.totalLeft());
        for (int column = labelSpan + 1; column < 7; column++) {
            text(totals, column, "", styles.total());
        }
        money(totals, 7, document.totals().grossPrizeAmount(), styles.totalMoney());
        money(totals, 8, document.totals().taxAmount(), styles.totalMoney());
        money(totals, 9, document.totals().netClaimAmount(), styles.totalMoney());

        buildSignatureBlock(sheet, styles, rowNumber + 1, lastColumn);
    }

    private int writeTicketRows(
            Sheet sheet,
            Styles styles,
            PrizeClaimSubmissionDocument document,
            int firstRow
    ) {
        List<PrizeClaimSubmissionDocument.TicketLine> tickets = document.tickets();
        int rowNumber = firstRow;
        for (int index = 0; index < tickets.size(); index++) {
            PrizeClaimSubmissionDocument.TicketLine ticket = tickets.get(index);
            Row row = sheet.createRow(rowNumber++);
            boolean zebra = index % 2 == 1;

            number(row, 0, index + 1, styles.body(zebra));
            text(row, 1, ticket.stationCode(), styles.body(zebra));
            text(row, 2, ticket.stationName(), styles.bodyLeft(zebra));
            text(row, 3, ticket.drawDate(), styles.body(zebra));
            text(row, 4, ticket.numbers(), styles.body(zebra));
            text(row, 5, ticket.serialNumber(), styles.bodyLeft(zebra));
            text(row, 6, ticket.prizeDisplayName(), styles.bodyLeft(zebra));
            money(row, 7, ticket.grossPrizeAmount(), styles.money(zebra));
            money(row, 8, ticket.taxAmount(), styles.money(zebra));
            money(row, 9, ticket.netClaimAmount(), styles.money(zebra));
        }
        return rowNumber;
    }

    private void buildStationSheet(
            XSSFWorkbook workbook,
            Styles styles,
            PrizeClaimSubmissionDocument document
    ) {
        Sheet sheet = workbook.createSheet("Tổng hợp theo đài");
        for (int index = 0; index < STATION_WIDTHS.length; index++) {
            sheet.setColumnWidth(index, STATION_WIDTHS[index] * 256);
        }

        Row title = sheet.createRow(0);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, STATION_HEADERS.size() - 1));
        text(title, 0, String.format("TỔNG HỢP THEO ĐÀI — PHIẾU %s",
                nullToDash(document.header().submissionCode())), styles.documentTitle());
        title.setHeightInPoints(24);

        writeHeaderRow(sheet, styles, 2, STATION_HEADERS);
        sheet.createFreezePane(0, 3);

        List<PrizeClaimSubmissionDocument.StationSummary> stations = document.stationSummaries();
        int rowNumber = 3;
        for (int index = 0; index < stations.size(); index++) {
            PrizeClaimSubmissionDocument.StationSummary station = stations.get(index);
            Row row = sheet.createRow(rowNumber++);
            boolean zebra = index % 2 == 1;

            number(row, 0, index + 1, styles.body(zebra));
            text(row, 1, station.stationCode(), styles.body(zebra));
            text(row, 2, station.stationName(), styles.bodyLeft(zebra));
            number(row, 3, station.ticketCount(), styles.money(zebra));
            money(row, 4, station.grossPrizeAmount(), styles.money(zebra));
            money(row, 5, station.taxAmount(), styles.money(zebra));
            money(row, 6, station.netClaimAmount(), styles.money(zebra));
        }

        Row totals = sheet.createRow(rowNumber);
        sheet.addMergedRegion(new CellRangeAddress(totals.getRowNum(), totals.getRowNum(), 0, 2));
        text(totals, 0, String.format("TỔNG CỘNG %d nhà đài", document.totals().stationCount()),
                styles.totalLeft());
        text(totals, 1, "", styles.total());
        text(totals, 2, "", styles.total());
        number(totals, 3, document.totals().ticketCount(), styles.totalMoney());
        money(totals, 4, document.totals().grossPrizeAmount(), styles.totalMoney());
        money(totals, 5, document.totals().taxAmount(), styles.totalMoney());
        money(totals, 6, document.totals().netClaimAmount(), styles.totalMoney());
    }

    private int buildLetterhead(
            Sheet sheet,
            Styles styles,
            PrizeClaimSubmissionDocument document,
            int columnCount
    ) {
        PrizeClaimSubmissionDocument.Header header = document.header();
        PrizeClaimSubmissionDocument.Party submitter = document.submitter();
        int lastColumn = columnCount - 1;
        int mid = Math.max(1, columnCount / 2);

        Row issuerRow = sheet.createRow(0);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, mid - 1));
        text(issuerRow, 0, submitter.name(), styles.issuerName());
        sheet.addMergedRegion(new CellRangeAddress(0, 0, mid, lastColumn));
        text(issuerRow, mid, "Mẫu số: 02-VT/NT", styles.mutedRight());

        Row addressRow = sheet.createRow(1);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, mid - 1));
        text(addressRow, 0, "Địa chỉ: " + nullToDash(submitter.address()), styles.muted());
        sheet.addMergedRegion(new CellRangeAddress(1, 1, mid, lastColumn));
        text(addressRow, mid, "Số phiếu: " + nullToDash(header.submissionCode()), styles.mutedRight());

        Row titleRow = sheet.createRow(3);
        sheet.addMergedRegion(new CellRangeAddress(3, 3, 0, lastColumn));
        text(titleRow, 0, "PHIẾU NỘP VÉ TRÚNG THƯỞNG", styles.documentTitle());
        titleRow.setHeightInPoints(28);

        Row subtitleRow = sheet.createRow(4);
        sheet.addMergedRegion(new CellRangeAddress(4, 4, 0, lastColumn));
        text(subtitleRow, 0, String.format("Kỳ nộp: %s  ·  %s  ·  %s",
                nullToDash(header.periodLabel()),
                nullToDash(header.status()),
                nullToDash(header.deliveryMode())),
                styles.subtitle());

        PrizeClaimSubmissionDocument.Party recipient = document.recipient();
        PrizeClaimSubmissionDocument.Operator submittedBy = document.submittedBy();
        PrizeClaimSubmissionDocument.Operator handedOverBy = document.handedOverBy();

        List<String[]> fields = List.of(
                new String[]{"Bên nộp:", submitter.name(),
                        "Bên nhận:", recipient.name()},
                new String[]{"Mã số thuế bên nộp:", submitter.taxCode(),
                        "Mã bên nhận:", recipient.code()},
                new String[]{"Người liên hệ bên nộp:", submitter.contactName(),
                        "MST bên nhận:", recipient.taxCode()},
                new String[]{"SĐT bên nộp:", submitter.phone(),
                        "Người liên hệ bên nhận:", recipient.contactName()},
                new String[]{"Email bên nộp:", submitter.email(),
                        "SĐT bên nhận:", recipient.phone()},
                new String[]{"Hình thức bàn giao:", header.deliveryMode(),
                        "Mã tham chiếu NCC:", nullToDash(header.supplierReference())},
                new String[]{"Ngày lập phiếu:", header.submittedAt(),
                        "Ngày bàn giao:", nullToDash(header.handedOverAt())},
                new String[]{"Người lập phiếu:", operatorLabel(submittedBy),
                        "Người bàn giao:", operatorLabel(handedOverBy)},
                new String[]{"Ghi chú:", nullToDash(header.handoverNote()),
                        "Tổng số vé:", String.format("%,d vé", document.totals().ticketCount())}
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

        return rowIndex + 1;
    }

    private String operatorLabel(PrizeClaimSubmissionDocument.Operator operator) {
        if (operator == null || operator.fullName() == null || operator.fullName().isBlank()) {
            return "—";
        }
        if (operator.role() != null && !operator.role().isBlank()) {
            return operator.fullName() + " (" + operator.role() + ")";
        }
        return operator.fullName();
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
        boolean filled = value != null && !value.isBlank() && !"—".equals(value);
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
        String[] roles = {"NGƯỜI NỘP VÉ", "THỦ KHO NHẬN VÉ", "KẾ TOÁN"};

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
            partyLabel = base(workbook, boldFont, HorizontalAlignment.LEFT, PARTY_BG, true, null);
            party = base(workbook, bodyFont, HorizontalAlignment.LEFT, PARTY_BG, true, null);
            partyEmpty = base(workbook, mutedFont, HorizontalAlignment.LEFT, PARTY_BG, true, null);
            tableHeader = base(workbook, headerFont, HorizontalAlignment.CENTER, BRAND, true, null);
            tableHeader.setWrapText(true);

            for (int index = 0; index < 2; index++) {
                byte[] fill = index == 1 ? ZEBRA : null;
                body[index] = base(workbook, bodyFont, HorizontalAlignment.CENTER, fill, true, null);
                bodyLeft[index] = base(workbook, bodyFont, HorizontalAlignment.LEFT, fill, true, null);
                money[index] = base(workbook, bodyFont, HorizontalAlignment.RIGHT, fill, true, MONEY_FORMAT);
            }

            total = base(workbook, boldFont, HorizontalAlignment.CENTER, TOTAL_BG, true, null);
            totalLeft = base(workbook, boldFont, HorizontalAlignment.LEFT, TOTAL_BG, true, null);
            totalMoney = base(workbook, boldFont, HorizontalAlignment.RIGHT, TOTAL_BG, true, MONEY_FORMAT);
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
