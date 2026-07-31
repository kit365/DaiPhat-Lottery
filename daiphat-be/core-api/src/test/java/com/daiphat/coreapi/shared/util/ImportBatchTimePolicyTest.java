package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ImportBatchTimePolicy Unit Tests")
class ImportBatchTimePolicyTest {

    @Test
    @DisplayName("keeps requested type for same-day NEW")
    void classify_sameDay_keepsNew() {
        ImportBatchTimePolicy.ClassificationResult result = ImportBatchTimePolicy.classify(
                ImportBatchType.NEW,
                LocalDate.of(2026, 7, 28),
                LocalDateTime.of(2026, 7, 28, 14, 0)
        );

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.NEW);
        assertThat(result.lateImportWarning()).isFalse();
    }

    @Test
    @DisplayName("rejects invalid requested batch type")
    void classify_invalidRequestedType_throws() {
        assertThatThrownBy(() -> ImportBatchTimePolicy.classify(
                ImportBatchType.ADJUSTMENT,
                LocalDate.of(2026, 7, 28),
                LocalDateTime.of(2026, 7, 28, 14, 0)
        ))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_INVALID_BATCH_TYPE);
    }
}
