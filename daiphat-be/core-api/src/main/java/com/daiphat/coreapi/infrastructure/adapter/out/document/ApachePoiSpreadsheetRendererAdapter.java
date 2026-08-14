package com.daiphat.coreapi.infrastructure.adapter.out.document;

import com.daiphat.coreapi.application.dto.document.*;
import com.daiphat.coreapi.application.port.out.document.SpreadsheetRendererPort;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;

/** Apache POI implementation shared by every XLSX export. */
@Component
@Slf4j
public class ApachePoiSpreadsheetRendererAdapter implements SpreadsheetRendererPort {
    public static final String XLSX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Override
    public SpreadsheetDocument render(SpreadsheetWorkbookSpec workbookSpec, String requestedFileName) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Styles styles = new Styles(workbook);
            for (SpreadsheetSheetSpec sheetSpec : workbookSpec.sheets()) {
                writeSheet(workbook.createSheet(safeSheetName(sheetSpec.name())), sheetSpec, styles);
            }
            workbook.write(output);
            return new SpreadsheetDocument(output.toByteArray(), safeFileName(requestedFileName), XLSX_CONTENT_TYPE);
        } catch (IOException exception) {
            log.error("Could not render spreadsheet", exception);
            throw new IllegalStateException("Could not render spreadsheet", exception);
        }
    }

    private void writeSheet(Sheet sheet, SpreadsheetSheetSpec spec, Styles styles) {
        List<SpreadsheetColumnSpec> columns = spec.columns();
        for (int index = 0; index < columns.size(); index++) {
            sheet.setColumnWidth(index, columns.get(index).width());
        }
        int rowIndex = 0;
        if (spec.includeHeader()) {
            Row header = sheet.createRow(rowIndex++);
            for (int index = 0; index < columns.size(); index++) {
                SpreadsheetColumnSpec column = columns.get(index);
                Cell cell = header.createCell(index);
                cell.setCellValue(column.header());
                cell.setCellStyle(styles.header());
            }
        }
        for (List<Object> values : spec.rows()) {
            Row row = sheet.createRow(rowIndex++);
            for (int index = 0; index < columns.size(); index++) {
                writeCell(row.createCell(index), index < values.size() ? values.get(index) : null,
                        columns.get(index).format(), styles);
            }
        }
        if (spec.includeHeader()) {
            sheet.createFreezePane(0, 1);
        }
    }

    private void writeCell(Cell cell, Object value, SpreadsheetValueFormat format, Styles styles) {
        if (value == null) {
            cell.setCellValue("");
            return;
        }
        if (value instanceof LocalDate date) {
            cell.setCellValue(java.sql.Date.valueOf(date));
        } else if (value instanceof BigDecimal decimal) {
            // POI numeric cells require a primitive; parse the exact decimal representation here only.
            cell.setCellValue(Double.parseDouble(decimal.toPlainString()));
        } else if (value instanceof Number number) {
            cell.setCellValue(Double.parseDouble(number.toString()));
        } else if (value instanceof Boolean bool) {
            cell.setCellValue(bool);
        } else {
            cell.setCellValue(String.valueOf(value));
        }
        CellStyle style = styles.forFormat(format);
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private String safeFileName(String name) {
        String safe = name == null ? "export.xlsx" : name.replaceAll("[^A-Za-z0-9._-]", "-");
        return safe.toLowerCase().endsWith(".xlsx") ? safe : safe + ".xlsx";
    }

    private String safeSheetName(String name) {
        return WorkbookUtil.createSafeSheetName(name == null || name.isBlank() ? "Dữ liệu" : name);
    }

    private static final class Styles {
        private final CellStyle header;
        private final EnumMap<SpreadsheetValueFormat, CellStyle> byFormat = new EnumMap<>(SpreadsheetValueFormat.class);

        private Styles(Workbook workbook) {
            DataFormat dataFormat = workbook.createDataFormat();
            Font bold = workbook.createFont();
            bold.setBold(true);
            header = workbook.createCellStyle();
            header.setFont(bold);
            byFormat.put(SpreadsheetValueFormat.INTEGER, numeric(workbook, dataFormat, "0"));
            byFormat.put(SpreadsheetValueFormat.DECIMAL, numeric(workbook, dataFormat, "#,##0.00"));
            byFormat.put(SpreadsheetValueFormat.MONEY, numeric(workbook, dataFormat, "#,##0.00 [$₫-vi-VN]"));
            byFormat.put(SpreadsheetValueFormat.PERCENT, numeric(workbook, dataFormat, "0.00%"));
            byFormat.put(SpreadsheetValueFormat.DATE, numeric(workbook, dataFormat, "dd/MM/yyyy"));
        }

        private CellStyle header() { return header; }
        private CellStyle forFormat(SpreadsheetValueFormat format) { return byFormat.get(format); }
        private static CellStyle numeric(Workbook workbook, DataFormat dataFormat, String pattern) {
            CellStyle style = workbook.createCellStyle();
            style.setDataFormat(dataFormat.getFormat(pattern));
            return style;
        }
    }
}
