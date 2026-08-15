package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.shared.util.tabular.TabularNumberStyle;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

import java.time.LocalDate;

/**
 * Which column of the uploaded file feeds which field.
 *
 * <p>Columns are addressed by header label, with "COL:n" available as a fallback
 * for headerless files. Header labels are used rather than plain indexes because
 * suppliers insert columns without warning, and an index would then silently read
 * the wrong data.
 *
 * <p>Two shapes of file are supported, decided by which columns are mapped:
 * <ul>
 *   <li><b>Declaration only</b> - {@link #quantityColumn} is mapped. Creates the
 *       import batch and its lines; ticket entry happens later by hand.</li>
 *   <li><b>Full ticket import</b> - {@link #numbersColumn} and
 *       {@link #serialsColumn} are mapped. One row is one lottery number plus all
 *       its physical serials; the declared quantity is derived from the serial
 *       count, and {@link #quantityColumn} becomes a cross-check.</li>
 * </ul>
 *
 * <p>Every parsing knob may be left null, in which case it is auto-detected and
 * echoed back on the response so the user can see what was applied.
 */
@Builder
public record ImportBatchFileMappingRequest(
        Integer headerRowIndex,

        String delimiter,

        String charset,

        TabularNumberStyle numberStyle,

        String dateFormat,

        /** Optional: when absent every row falls back to {@link #fallbackDrawDate()}. */
        String drawDateColumn,

        LocalDate fallbackDrawDate,

        /**
         * Station business code. Preferred over {@link #stationColumn()}: a code is
         * exact, so a file exported by this system never needs name matching.
         */
        String stationCodeColumn,

        @NotBlank(message = "Cột nhà đài không được để trống")
        String stationColumn,

        /**
         * Declared ticket count. Required when no serial column is mapped; a
         * cross-check against the serial count otherwise.
         */
        String quantityColumn,

        /** The lottery number itself, e.g. "123456". */
        String numbersColumn,

        /** One cell holding every serial of that lottery number, separated by {@link #serialSeparator()}. */
        String serialsColumn,

        /**
         * One image URL for the whole row, or one per serial in the same order,
         * separated by {@link #serialSeparator()}.
         */
        String ticketImageColumn,

        /** Defaults to ";" - suppliers rarely use anything else inside a cell. */
        String serialSeparator,

        /** Optional; only compared against the configured station price. */
        String importCostColumn,

        /**
         * Station sale price declared by the supplier. Compared against
         * lottery_stations.price during preview; a gap blocks the import.
         */
        String salePriceColumn,

        /** Commission percentage in the file, e.g. {@code 10} meaning 10%. */
        String commissionRateColumn
) {

    public static final String DEFAULT_SERIAL_SEPARATOR = ";";

    public TabularNumberStyle numberStyleOrAuto() {
        return numberStyle == null ? TabularNumberStyle.AUTO : numberStyle;
    }

    public String serialSeparatorOrDefault() {
        return serialSeparator == null || serialSeparator.isEmpty()
                ? DEFAULT_SERIAL_SEPARATOR
                : serialSeparator;
    }

    /** True when the file carries the tickets themselves, not just a declaration. */
    public boolean importsTickets() {
        return hasText(numbersColumn) && hasText(serialsColumn);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
