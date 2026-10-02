package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchLineSelectionSnapshotRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchSelectionSnapshotRequest;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportBatchSelectionSnapshotValidatorTest {

    @Mock
    private ImportBatchRepositoryPort repository;

    private ImportBatchSelectionSnapshotValidator validator;
    private ImportBatchModel batch;
    private ImportBatchSelectionSnapshotRequest snapshot;

    @BeforeEach
    void setUp() {
        validator = new ImportBatchSelectionSnapshotValidator(repository);
        LocalDateTime updatedAt = LocalDateTime.of(2026, 10, 3, 9, 30);
        ImportBatchLineModel line = ImportBatchLineModel.builder()
                .id(11L)
                .lotteryStationId(7L)
                .status(ImportBatchLineStatus.OPEN)
                .declareQuantity(100)
                .totalQuantity(25)
                .importCost(new BigDecimal("9500.00"))
                .build();
        batch = ImportBatchModel.builder()
                .id(1L)
                .status(ImportBatchStatus.RECEIVING)
                .totalDeclareQuantity(100)
                .totalImportedQuantity(25)
                .updatedAt(updatedAt)
                .lines(List.of(line))
                .build();
        snapshot = ImportBatchSelectionSnapshotRequest.builder()
                .status(ImportBatchStatus.RECEIVING)
                .updatedAt(updatedAt)
                .totalDeclareQuantity(100)
                .totalImportedQuantity(25)
                .lines(List.of(ImportBatchLineSelectionSnapshotRequest.builder()
                        .id(11L)
                        .lotteryStationId(7L)
                        .status(ImportBatchLineStatus.OPEN)
                        .declareQuantity(100)
                        .totalQuantity(25)
                        .importCost(new BigDecimal("9500"))
                        .build()))
                .build();
    }

    @Test
    void validateAcceptsUnchangedBatchAndAllocation() {
        when(repository.findById(1L)).thenReturn(Optional.of(batch));

        assertThat(validator.validate(1L, snapshot)).isSameAs(batch);
    }

    @Test
    void validateRejectsChangedLineQuantity() {
        batch.getLines().getFirst().setDeclareQuantity(99);
        when(repository.findById(1L)).thenReturn(Optional.of(batch));

        assertStale();
    }

    @Test
    void validateRejectsDeletedLine() {
        batch.setLines(List.of());
        when(repository.findById(1L)).thenReturn(Optional.of(batch));

        assertStale();
    }

    @Test
    void validateRejectsChangedBatchStatus() {
        batch.setStatus(ImportBatchStatus.CANCELLED);
        when(repository.findById(1L)).thenReturn(Optional.of(batch));

        assertStale();
    }

    private void assertStale() {
        assertThatThrownBy(() -> validator.validate(1L, snapshot))
                .isInstanceOf(DomainException.class)
                .satisfies(error -> assertThat(((DomainException) error).getErrorCode())
                        .isEqualTo(ErrorCode.IMPORT_BATCH_SELECTION_STALE));
    }
}
