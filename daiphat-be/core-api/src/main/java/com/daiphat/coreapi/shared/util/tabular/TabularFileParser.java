package com.daiphat.coreapi.shared.util.tabular;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Reads a supplier .csv / .xlsx upload into a header + rows structure.
 *
 * <p>Deliberately tolerant: encoding, delimiter and blank padding rows are all
 * detected rather than demanded, because supplier files are produced by Excel
 * with a Vietnamese locale and rarely match a strict spec.
 */
@Component
@Slf4j
public class TabularFileParser {

    public static final int MAX_ROWS = 2000;
    public static final int MAX_COLUMNS = 50;

    private static final char[] CANDIDATE_DELIMITERS = {',', ';', '\t', '|'};

    /**
     * Excel on a Vietnamese Windows writes CSV in this legacy code page when the
     * user picks plain "CSV" instead of "CSV UTF-8".
     */
    private static final String VN_LEGACY_CHARSET = "windows-1258";

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    public TabularTable parse(byte[] content, String originalFilename, TabularParseOptions options) {
        if (content == null || content.length == 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_REQUIRED);
        }

        TabularParseOptions effective = options == null ? TabularParseOptions.auto() : options;
        String extension = extensionOf(originalFilename);

        return switch (extension) {
            case "xlsx", "xlsm" -> parseExcel(content, effective);
            case "csv", "txt" -> parseCsv(content, effective);
            default -> throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_UNSUPPORTED_FORMAT);
        };
    }

    // ---------------------------------------------------------------- CSV

    private TabularTable parseCsv(byte[] content, TabularParseOptions options) {
        Charset charset = resolveCharset(content, options.charset());
        String text = decode(content, charset);
        char delimiter = resolveDelimiter(text, options.delimiter());

        CSVFormat format = CSVFormat.Builder.create(CSVFormat.DEFAULT)
                .setDelimiter(delimiter)
                .setIgnoreEmptyLines(true)
                .setIgnoreSurroundingSpaces(true)
                .setTrim(true)
                .build();

        List<String> headers = null;
        List<TabularRow> rows = new ArrayList<>();
        List<List<String>> preamble = new ArrayList<>();
        int headerRowIndex = options.headerRowIndexOrDefault();
        int nonBlankIndex = 0;

        try (CSVParser parser = CSVParser.parse(new StringReader(text), format)) {
            for (CSVRecord record : parser) {
                List<String> cells = new ArrayList<>();
                record.forEach(cells::add);
                if (cells.stream().allMatch(cell -> cell == null || cell.isBlank())) {
                    continue;
                }

                if (nonBlankIndex < headerRowIndex) {
                    preamble.add(List.copyOf(cells));
                    nonBlankIndex++;
                    continue;
                }
                if (nonBlankIndex == headerRowIndex) {
                    headers = dedupeHeaders(cells);
                    nonBlankIndex++;
                    continue;
                }

                rows.add(toRow((int) record.getRecordNumber(), headers, cells));
                guardRowCount(rows.size(), options);
                nonBlankIndex++;
            }
        } catch (IOException e) {
            log.warn("Failed to parse CSV upload", e);
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_UNREADABLE, e);
        }

        if (headers == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_HEADER_NOT_FOUND);
        }
        return new TabularTable(headers, rows, charset.name(), String.valueOf(delimiter), preamble);
    }

    // -------------------------------------------------------------- Excel

    private TabularTable parseExcel(byte[] content, TabularParseOptions options) {
        List<String> headers = null;
        List<TabularRow> rows = new ArrayList<>();
        List<List<String>> preamble = new ArrayList<>();
        int headerRowIndex = options.headerRowIndexOrDefault();
        int nonBlankIndex = 0;

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter(new Locale("vi", "VN"));

            for (Row row : sheet) {
                List<String> cells = readExcelRow(row, formatter);
                if (cells.stream().allMatch(cell -> cell == null || cell.isBlank())) {
                    continue;
                }

                if (nonBlankIndex < headerRowIndex) {
                    preamble.add(List.copyOf(cells));
                    nonBlankIndex++;
                    continue;
                }
                if (nonBlankIndex == headerRowIndex) {
                    headers = dedupeHeaders(cells);
                    nonBlankIndex++;
                    continue;
                }

                rows.add(toRow(row.getRowNum() + 1, headers, cells));
                guardRowCount(rows.size(), options);
                nonBlankIndex++;
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof DomainException domainException) {
                throw domainException;
            }
            log.warn("Failed to parse XLSX upload", e);
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_UNREADABLE, e);
        }

        if (headers == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_HEADER_NOT_FOUND);
        }
        return new TabularTable(headers, rows, null, null, preamble);
    }

    private List<String> readExcelRow(Row row, DataFormatter formatter) {
        List<String> cells = new ArrayList<>();
        int lastCell = Math.min(row.getLastCellNum(), MAX_COLUMNS);
        for (int index = 0; index < lastCell; index++) {
            Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            cells.add(readExcelCell(cell, formatter));
        }
        return cells;
    }

    private String readExcelCell(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return "";
        }
        // Hand dates over as ISO text so the downstream date parser never has to
        // guess whether a number is a quantity or a serial date.
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate().format(ISO_DATE);
        }
        return formatter.formatCellValue(cell).trim();
    }

    // ------------------------------------------------------------ helpers

    private TabularRow toRow(int rowNumber, List<String> headers, List<String> cells) {
        Map<String, String> values = new LinkedHashMap<>();
        int columnCount = Math.min(cells.size(), MAX_COLUMNS);
        for (int index = 0; index < columnCount; index++) {
            String value = cells.get(index);
            values.put(TabularTable.positionalKey(index), value);
            if (headers != null && index < headers.size()) {
                values.put(headers.get(index), value);
            }
        }
        return new TabularRow(rowNumber, values);
    }

    private void guardRowCount(int size, TabularParseOptions options) {
        int limit = options.maxRowsOrDefault(MAX_ROWS);
        if (size > limit) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_TOO_MANY_ROWS, null, limit);
        }
    }

    /**
     * Keeps header labels usable as map keys. Blank headers become their
     * positional key; repeated headers get a numeric suffix.
     */
    private List<String> dedupeHeaders(List<String> cells) {
        List<String> headers = new ArrayList<>();
        int columnCount = Math.min(cells.size(), MAX_COLUMNS);
        for (int index = 0; index < columnCount; index++) {
            String raw = cells.get(index);
            String label = raw == null || raw.isBlank() ? TabularTable.positionalKey(index) : raw.trim();
            String candidate = label;
            int suffix = 2;
            while (headers.contains(candidate)) {
                candidate = label + " (" + suffix++ + ")";
            }
            headers.add(candidate);
        }
        return headers;
    }

    private Charset resolveCharset(byte[] content, String requested) {
        if (requested != null && !requested.isBlank()) {
            try {
                return Charset.forName(requested.trim());
            } catch (RuntimeException e) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_UNREADABLE, e);
            }
        }

        if (startsWith(content, (byte) 0xEF, (byte) 0xBB, (byte) 0xBF)) {
            return StandardCharsets.UTF_8;
        }
        if (startsWith(content, (byte) 0xFF, (byte) 0xFE)) {
            return StandardCharsets.UTF_16LE;
        }
        if (startsWith(content, (byte) 0xFE, (byte) 0xFF)) {
            return StandardCharsets.UTF_16BE;
        }

        return isValidUtf8(content) ? StandardCharsets.UTF_8 : legacyCharset();
    }

    private Charset legacyCharset() {
        try {
            return Charset.forName(VN_LEGACY_CHARSET);
        } catch (RuntimeException e) {
            // windows-1258 is not guaranteed to be installed on every JVM.
            return StandardCharsets.ISO_8859_1;
        }
    }

    private boolean isValidUtf8(byte[] content) {
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(content));
            return true;
        } catch (CharacterCodingException e) {
            return false;
        }
    }

    private boolean startsWith(byte[] content, byte... prefix) {
        if (content.length < prefix.length) {
            return false;
        }
        for (int index = 0; index < prefix.length; index++) {
            if (content[index] != prefix[index]) {
                return false;
            }
        }
        return true;
    }

    private String decode(byte[] content, Charset charset) {
        String text = new String(content, charset);
        // A UTF-8 BOM survives decoding as U+FEFF and would poison the first header.
        return text.isEmpty() || text.charAt(0) != '﻿' ? text : text.substring(1);
    }

    /**
     * Picks the delimiter that splits the header line into the most columns.
     * Vietnamese-locale Excel uses ';', so ',' cannot simply be assumed.
     */
    private char resolveDelimiter(String text, String requested) {
        if (requested != null && !requested.isBlank()) {
            return requested.charAt(0);
        }

        String headerLine = text.lines()
                .filter(line -> !line.isBlank())
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_FILE_HEADER_NOT_FOUND));

        char best = ',';
        int bestCount = 0;
        for (char candidate : CANDIDATE_DELIMITERS) {
            int count = countOutsideQuotes(headerLine, candidate);
            if (count > bestCount) {
                best = candidate;
                bestCount = count;
            }
        }
        return best;
    }

    private int countOutsideQuotes(String line, char delimiter) {
        int count = 0;
        boolean inQuotes = false;
        for (char ch : line.toCharArray()) {
            if (ch == '"') {
                inQuotes = !inQuotes;
            } else if (ch == delimiter && !inQuotes) {
                count++;
            }
        }
        return count;
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
