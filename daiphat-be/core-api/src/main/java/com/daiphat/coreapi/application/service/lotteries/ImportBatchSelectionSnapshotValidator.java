package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchLineSelectionSnapshotRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchSelectionSnapshotRequest;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Optimistic guard shared by OCR and file import. It binds a confirmation to the
 * exact batch allocation that the operator reviewed in the UI.
 */
@Component
@RequiredArgsConstructor
public class ImportBatchSelectionSnapshotValidator {

    private final ImportBatchRepositoryPort importBatchRepositoryPort;

    public ImportBatchModel validate(Long importBatchId, ImportBatchSelectionSnapshotRequest expected) {
        if (importBatchId == null || expected == null) {
            throw stale();
        }

        ImportBatchModel current = importBatchRepositoryPort.findById(importBatchId)
                .orElseThrow(this::stale);
        List<ImportBatchLineModel> currentLines = current.getActiveLines().stream()
                .sorted(Comparator.comparing(ImportBatchLineModel::getId))
                .toList();
        List<ImportBatchLineSelectionSnapshotRequest> expectedLines = expected.lines().stream()
                .sorted(Comparator.comparing(ImportBatchLineSelectionSnapshotRequest::id))
                .toList();

        boolean same = current.getStatus() == expected.status()
                && Objects.equals(zero(current.getTotalDeclareQuantity()), zero(expected.totalDeclareQuantity()))
                && Objects.equals(zero(current.getTotalImportedQuantity()), zero(expected.totalImportedQuantity()))
                && (expected.updatedAt() == null || Objects.equals(current.getUpdatedAt(), expected.updatedAt()))
                && currentLines.size() == expectedLines.size();

        if (same) {
            for (int index = 0; index < currentLines.size(); index++) {
                ImportBatchLineModel actual = currentLines.get(index);
                ImportBatchLineSelectionSnapshotRequest snapshot = expectedLines.get(index);
                if (!sameLine(actual, snapshot)) {
                    same = false;
                    break;
                }
            }
        }

        if (!same || !current.isEditable()) {
            throw stale();
        }
        return current;
    }

    private boolean sameLine(
            ImportBatchLineModel actual,
            ImportBatchLineSelectionSnapshotRequest expected
    ) {
        return Objects.equals(actual.getId(), expected.id())
                && Objects.equals(actual.getLotteryStationId(), expected.lotteryStationId())
                && actual.getStatus() == expected.status()
                && Objects.equals(zero(actual.getDeclareQuantity()), zero(expected.declareQuantity()))
                && Objects.equals(zero(actual.getTotalQuantity()), zero(expected.totalQuantity()))
                && decimalEquals(actual.getImportCost(), expected.importCost());
    }

    private int zero(Integer value) {
        return value == null ? 0 : value;
    }

    private boolean decimalEquals(BigDecimal left, BigDecimal right) {
        return (left == null ? BigDecimal.ZERO : left)
                .compareTo(right == null ? BigDecimal.ZERO : right) == 0;
    }

    private DomainException stale() {
        return new DomainException(ErrorCode.IMPORT_BATCH_SELECTION_STALE);
    }
}
