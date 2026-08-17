package com.daiphat.coreapi.shared.util;

import java.util.List;

/**
 * Writes CSV that Excel opens correctly on a Vietnamese Windows.
 *
 * <p>Two details matter and are easy to get wrong: the UTF-8 BOM, without which
 * Excel decodes the file with the system code page and mangles every accented
 * name, and CRLF line endings, which Excel expects.
 */
public final class CsvWriter {

    /** Excel only recognises a UTF-8 file when it starts with this marker. */
    public static final String UTF8_BOM = "﻿";

    private static final String LINE_SEPARATOR = "\r\n";

    private CsvWriter() {
    }

    public static String toCsv(List<String> headers, List<List<String>> rows) {
        StringBuilder csv = new StringBuilder(UTF8_BOM);
        csv.append(toLine(headers));
        for (List<String> row : rows) {
            csv.append(toLine(row));
        }
        return csv.toString();
    }

    private static String toLine(List<String> cells) {
        StringBuilder line = new StringBuilder();
        for (int index = 0; index < cells.size(); index++) {
            if (index > 0) {
                line.append(',');
            }
            line.append(escape(cells.get(index)));
        }
        return line.append(LINE_SEPARATOR).toString();
    }

    /**
     * Quotes a cell only when it has to be, so the file stays readable, and doubles
     * embedded quotes as the format requires.
     */
    private static String escape(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        boolean needsQuoting = value.indexOf(',') >= 0
                || value.indexOf('"') >= 0
                || value.indexOf('\n') >= 0
                || value.indexOf('\r') >= 0
                || value.startsWith(" ")
                || value.endsWith(" ");
        if (!needsQuoting) {
            return value;
        }
        return '"' + value.replace("\"", "\"\"") + '"';
    }
}
