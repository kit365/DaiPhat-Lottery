package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Generates unique codes for import batch headers and lines.
 * <ul>
 *   <li>Header (phiếu nhập): {@code PN-{drawDate}-{sequence}} e.g. {@code PN-20260707-0004}</li>
 *   <li>Line (lô theo đài): {@code LO-{drawDate}-{station}-{type}-{sequence}} e.g. {@code LO-20260707-BACLIEU-NEW-0005}</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ImportBatchCodeGenerator {

    public static final String HEADER_PREFIX = "PN";
    public static final String LINE_PREFIX = "LO";
    public static final String SEGMENT_SEPARATOR = "-";

    private static final DateTimeFormatter DRAW_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

    /** Short header code for the import batch voucher (no station — multi-station lives on lines). */
    public String generateHeaderCode(LocalDate drawDate) {
        long sequence = importBatchRepositoryPort.nextHeaderBatchCodeSequence();
        String drawDatePart = formatDrawDate(drawDate);
        return String.join(
                SEGMENT_SEPARATOR,
                HEADER_PREFIX,
                drawDatePart,
                String.format("%04d", sequence)
        );
    }

    /** Detailed line code scoped to one lottery station and batch type. */
    public String generateLineCode(LotteryStationModel station, ImportBatchType batchType, LocalDate drawDate) {
        long sequence = importBatchLineRepositoryPort.nextLineBatchCodeSequence();
        String drawDatePart = formatDrawDate(drawDate);
        String stationCode = toStationCode(station != null ? station.getName() : null);
        String typeCode = toTypeCode(batchType);
        return String.join(
                SEGMENT_SEPARATOR,
                LINE_PREFIX,
                drawDatePart,
                stationCode,
                typeCode,
                String.format("%04d", sequence)
        );
    }

    private String formatDrawDate(LocalDate drawDate) {
        return (drawDate != null ? drawDate : LocalDate.now()).format(DRAW_DATE_FORMAT);
    }

    static String toStationCode(String stationName) {
        if (stationName == null || stationName.isBlank()) {
            return "STATION";
        }
        String normalized = Normalizer.normalize(stationName.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .replaceAll("[^A-Za-z0-9]+", "")
                .toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "STATION";
        }
        return normalized.length() > 16 ? normalized.substring(0, 16) : normalized;
    }

    static String toTypeCode(ImportBatchType batchType) {
        if (batchType == null) {
            return "UNK";
        }
        return switch (batchType) {
            case NEW -> "NEW";
            case SUPPLEMENTARY -> "SUPP";
            case LATE_IMPORT -> "LATE";
            case ADJUSTMENT -> "ADJ";
        };
    }
}
