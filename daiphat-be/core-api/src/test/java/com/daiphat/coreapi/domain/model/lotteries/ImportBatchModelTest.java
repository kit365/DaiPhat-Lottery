package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ImportBatchModel Unit Tests")
class ImportBatchModelTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 7, 10, 0);

    @Test
    @DisplayName("markReceiving transitions DRAFT to RECEIVING")
    void markReceiving_fromDraft_setsReceiving() {
        ImportBatchModel batch = ImportBatchModel.builder()
                .status(ImportBatchStatus.DRAFT)
                .build();

        batch.markReceiving(NOW);

        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.RECEIVING);
    }

    @Test
    @DisplayName("refreshImportStatus moves to RECEIVING when any line has imports")
    void refreshImportStatus_partialImport_setsReceiving() {
        ImportBatchLineModel openLine = line(1L, ImportBatchLineStatus.OPEN, 10, 0);
        ImportBatchLineModel importingLine = line(2L, ImportBatchLineStatus.IMPORTING, 10, 3);
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.DRAFT, openLine, importingLine);

        batch.refreshImportStatus(NOW);

        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.RECEIVING);
    }

    @Test
    @DisplayName("refreshImportStatus completes batch only when all active lines are IMPORTED")
    void refreshImportStatus_allLinesImported_setsImported() {
        ImportBatchLineModel importedLine = line(1L, ImportBatchLineStatus.IMPORTED, 10, 10);
        ImportBatchLineModel secondImportedLine = line(2L, ImportBatchLineStatus.IMPORTED, 5, 5);
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.RECEIVING, importedLine, secondImportedLine);

        batch.refreshImportStatus(NOW);

        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.IMPORTED);
        assertThat(batch.getCompletedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("refreshImportStatus moves to PARTIALLY_IMPORTED when one line is IMPORTED and another is incomplete")
    void refreshImportStatus_oneLineIncomplete_setsPartiallyImported() {
        ImportBatchLineModel importedLine = line(1L, ImportBatchLineStatus.IMPORTED, 10, 10);
        ImportBatchLineModel importingLine = line(2L, ImportBatchLineStatus.IMPORTING, 10, 4);
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.RECEIVING, importedLine, importingLine);

        batch.refreshImportStatus(NOW);

        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.PARTIALLY_IMPORTED);
    }

    @Test
    @DisplayName("refreshImportStatus completes batch when all non-cancelled lines are IMPORTED")
    void refreshImportStatus_importedAndCancelled_setsImported() {
        ImportBatchLineModel importedLine = line(1L, ImportBatchLineStatus.IMPORTED, 10, 10);
        ImportBatchLineModel cancelledLine = line(2L, ImportBatchLineStatus.CANCELLED, 5, 0);
        cancelledLine.setCancelReason("cancelled");
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.PARTIALLY_IMPORTED, importedLine, cancelledLine);

        batch.refreshImportStatus(NOW);

        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.IMPORTED);
        assertThat(batch.getCompletedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("refreshImportStatus stays RECEIVING when no line is fully IMPORTED yet")
    void refreshImportStatus_partialImportNoLineImported_staysReceiving() {
        ImportBatchLineModel openLine = line(1L, ImportBatchLineStatus.OPEN, 10, 0);
        ImportBatchLineModel importingLine = line(2L, ImportBatchLineStatus.IMPORTING, 10, 3);
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.DRAFT, openLine, importingLine);

        batch.refreshImportStatus(NOW);

        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.RECEIVING);
    }

    @Test
    @DisplayName("recalculateAggregates ignores soft-deleted lines")
    void recalculateAggregates_excludesSoftDeletedLines() {
        ImportBatchLineModel activeLine = line(1L, ImportBatchLineStatus.IMPORTING, 10, 4);
        ImportBatchLineModel deletedLine = line(2L, ImportBatchLineStatus.OPEN, 20, 0);
        deletedLine.softDelete(NOW);
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.RECEIVING, activeLine, deletedLine);

        batch.recalculateAggregates();

        assertThat(batch.getLineCount()).isEqualTo(1);
        batch.setTotalDeclareQuantity(10);
        batch.recalculateAggregates();

        assertThat(batch.getTotalDeclareQuantity()).isEqualTo(10);
        assertThat(batch.getTotalImportedQuantity()).isEqualTo(4);
    }

    @Test
    @DisplayName("areAllLinesImported requires IMPORTED status on every active line")
    void areAllLinesImported_requiresImportedStatus() {
        ImportBatchLineModel quantityCompleteButImporting = line(1L, ImportBatchLineStatus.IMPORTING, 10, 10);
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.RECEIVING, quantityCompleteButImporting);

        assertThat(batch.areAllLinesImported()).isFalse();

        quantityCompleteButImporting.setStatus(ImportBatchLineStatus.IMPORTED);
        assertThat(batch.areAllLinesImported()).isTrue();
    }

    @Test
    @DisplayName("areAllActiveLinesCancelled requires CANCELLED status on every active line")
    void areAllActiveLinesCancelled_requiresAllCancelled() {
        ImportBatchLineModel cancelledLine = line(1L, ImportBatchLineStatus.CANCELLED, 10, 0);
        cancelledLine.setCancelReason("cancelled");
        ImportBatchLineModel openLine = line(2L, ImportBatchLineStatus.OPEN, 5, 0);
        ImportBatchModel batch = batchWithLines(ImportBatchStatus.RECEIVING, cancelledLine, openLine);

        assertThat(batch.areAllActiveLinesCancelled()).isFalse();

        openLine.setStatus(ImportBatchLineStatus.CANCELLED);
        openLine.setCancelReason("cancelled");
        assertThat(batch.areAllActiveLinesCancelled()).isTrue();
    }

    private static ImportBatchModel batchWithLines(ImportBatchStatus status, ImportBatchLineModel... lines) {
        return ImportBatchModel.builder()
                .status(status)
                .lines(new ArrayList<>(List.of(lines)))
                .build();
    }

    private static ImportBatchLineModel line(
            Long id,
            ImportBatchLineStatus status,
            int declareQuantity,
            int totalQuantity
    ) {
        ImportBatchLineModel line = ImportBatchLineModel.builder()
                .id(id)
                .declareQuantity(declareQuantity)
                .totalQuantity(totalQuantity)
                .importCost(BigDecimal.valueOf(10000))
                .status(status)
                .build();
        line.recalculateDeclaredCostValue();
        line.recalculateTotalCostValue();
        return line;
    }
}
