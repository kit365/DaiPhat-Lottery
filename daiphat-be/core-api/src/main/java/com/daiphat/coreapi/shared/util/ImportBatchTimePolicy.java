package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public final class ImportBatchTimePolicy {

    private static final String LATE_IMPORT_WARNING =
            "Đang trong khung giờ nhập muộn (14:30 - 15:00). Loại lô được chuyển thành LATE_IMPORT.";

    private ImportBatchTimePolicy() {
    }

    public static ClassificationResult classify(
            ImportBatchType requestedBatchType,
            LocalDate drawDate,
            LocalDateTime now,
            LocalTime lateWindowStart,
            LocalTime cutoff
    ) {
        validateRequestedBatchType(requestedBatchType);

        if (drawDate == null || !drawDate.equals(now.toLocalDate())) {
            return new ClassificationResult(requestedBatchType, false, List.of());
        }

        LocalTime currentTime = now.toLocalTime();
        if (currentTime.isAfter(cutoff)) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_CUTOFF_PASSED);
        }

        if (!currentTime.isBefore(lateWindowStart)) {
            List<String> warnings = new ArrayList<>();
            warnings.add(LATE_IMPORT_WARNING);
            return new ClassificationResult(ImportBatchType.LATE_IMPORT, true, warnings);
        }

        return new ClassificationResult(requestedBatchType, false, List.of());
    }

    private static void validateRequestedBatchType(ImportBatchType requestedBatchType) {
        if (requestedBatchType != ImportBatchType.NEW
                && requestedBatchType != ImportBatchType.SUPPLEMENTARY) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_BATCH_TYPE);
        }
    }

    public record ClassificationResult(
            ImportBatchType resolvedBatchType,
            boolean lateImportWarning,
            List<String> warnings
    ) {
    }
}
