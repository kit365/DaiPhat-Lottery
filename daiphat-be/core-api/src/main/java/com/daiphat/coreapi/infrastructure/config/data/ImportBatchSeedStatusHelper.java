package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Mirrors {@code ImportBatchLineModel#updateImportProgress} /
 * {@code ImportBatchModel#refreshImportStatus} so seed rows never show
 * {@code IMPORTED} / "Đã nhập đủ" when imported quantity is still short of declared.
 */
final class ImportBatchSeedStatusHelper {

    private ImportBatchSeedStatusHelper() {
    }

    static ImportBatchLineStatus resolveLineStatus(int importedQuantity, int declareQuantity) {
        if (declareQuantity > 0 && importedQuantity >= declareQuantity) {
            return ImportBatchLineStatus.IMPORTED;
        }
        if (importedQuantity > 0) {
            return ImportBatchLineStatus.IMPORTING;
        }
        return ImportBatchLineStatus.OPEN;
    }

    static void applyLineStatus(ImportBatchLineEntity line, LocalDateTime now) {
        if (line == null) {
            return;
        }
        int imported = line.getTotalQuantity() != null ? line.getTotalQuantity() : 0;
        int declared = line.getDeclareQuantity() != null ? line.getDeclareQuantity() : 0;
        ImportBatchLineStatus status = resolveLineStatus(imported, declared);
        line.setStatus(status);
        if (status == ImportBatchLineStatus.IMPORTED) {
            if (line.getImportedAt() == null) {
                line.setImportedAt(now);
            }
        } else if (imported <= 0) {
            line.setImportedAt(null);
        }
    }

    static void applyHeaderStatus(ImportBatchEntity batch, List<ImportBatchLineEntity> lines, LocalDateTime now) {
        if (batch == null) {
            return;
        }
        List<ImportBatchLineEntity> active = lines == null ? List.of() : lines.stream()
                .filter(line -> line.getStatus() != ImportBatchLineStatus.CANCELLED)
                .toList();
        boolean allImported = !active.isEmpty()
                && active.stream().allMatch(line -> line.getStatus() == ImportBatchLineStatus.IMPORTED);
        boolean anyImportedLine = active.stream().anyMatch(line -> line.getStatus() == ImportBatchLineStatus.IMPORTED);
        boolean anyQuantity = active.stream()
                .anyMatch(line -> line.getTotalQuantity() != null && line.getTotalQuantity() > 0);

        if (allImported) {
            batch.setStatus(ImportBatchStatus.IMPORTED);
            if (batch.getCompletedAt() == null) {
                batch.setCompletedAt(now);
            }
            return;
        }
        batch.setCompletedAt(null);
        if (anyImportedLine) {
            batch.setStatus(ImportBatchStatus.PARTIALLY_IMPORTED);
        } else if (anyQuantity) {
            batch.setStatus(ImportBatchStatus.RECEIVING);
        } else {
            batch.setStatus(ImportBatchStatus.DRAFT);
        }
    }
}
