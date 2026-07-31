package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Legacy helper retained for unit tests. Production classification uses {@link ImportBatchTypeResolver}.
 */
public final class ImportBatchTimePolicy {

    private ImportBatchTimePolicy() {
    }

    public static ClassificationResult classify(
            ImportBatchType requestedBatchType,
            LocalDate drawDate,
            LocalDateTime now
    ) {
        validateRequestedBatchType(requestedBatchType);

        if (drawDate == null || !drawDate.equals(now.toLocalDate())) {
            return new ClassificationResult(requestedBatchType, false, List.of());
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
