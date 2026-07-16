package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ImportBatchTimePolicy Unit Tests")
class ImportBatchTimePolicyTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 6);
    private static final LocalTime LATE_START = LocalTime.of(14, 30);
    private static final LocalTime CUTOFF = LocalTime.of(15, 0);

    @Test
    @DisplayName("returns requested type when draw date is not today")
    void classify_futureDrawDate_returnsRequestedType() {
        ImportBatchTimePolicy.ClassificationResult result = ImportBatchTimePolicy.classify(
                ImportBatchType.NEW,
                TODAY.plusDays(1),
                LocalDateTime.of(TODAY, LocalTime.of(14, 45)),
                LATE_START,
                CUTOFF
        );

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.NEW);
        assertThat(result.lateImportWarning()).isFalse();
    }

    @Test
    @DisplayName("forces LATE_IMPORT between late window start and cutoff")
    void classify_lateWindow_forcesLateImport() {
        ImportBatchTimePolicy.ClassificationResult result = ImportBatchTimePolicy.classify(
                ImportBatchType.SUPPLEMENTARY,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(14, 30)),
                LATE_START,
                CUTOFF
        );

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.LATE_IMPORT);
        assertThat(result.lateImportWarning()).isTrue();
    }

    @Test
    @DisplayName("rejects import after cutoff on draw day")
    void classify_afterCutoff_throws() {
        assertThatThrownBy(() -> ImportBatchTimePolicy.classify(
                ImportBatchType.NEW,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(15, 1)),
                LATE_START,
                CUTOFF
        ))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_CUTOFF_PASSED);
    }
}
