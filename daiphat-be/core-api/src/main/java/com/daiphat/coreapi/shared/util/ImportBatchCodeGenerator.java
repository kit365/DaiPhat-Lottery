package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class ImportBatchCodeGenerator {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

    public String generate(LotteryStationModel station, ImportBatchType batchType, LocalDate importDate) {
        long sequence = importBatchLineRepositoryPort.nextBatchCodeSequence();
        String stationCode = toStationCode(station != null ? station.getName() : null);
        String typeCode = toTypeCode(batchType);
        String datePart = (importDate != null ? importDate : LocalDate.now()).format(DATE_FORMAT);
        return String.format("%04d_%s_%s_%s", sequence, stationCode, typeCode, datePart);
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
        return normalized.length() > 20 ? normalized.substring(0, 20) : normalized;
    }

    static String toTypeCode(ImportBatchType batchType) {
        if (batchType == null) {
            return "UNKNOWN";
        }
        return switch (batchType) {
            case NEW -> "NEW";
            case SUPPLEMENTARY -> "SUPPLEMENT";
            case LATE_IMPORT -> "LATE_IMPORT";
            case ADJUSTMENT -> "ADDITIONAL";
        };
    }
}
