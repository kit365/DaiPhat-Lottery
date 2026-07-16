package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportBatchLineModel {

    private Long id;
    private Long importBatchId;
    private Long lotteryStationId;
    private ImportBatchType batchType;
    private String batchCode;
    private Integer declareQuantity;
    @Builder.Default
    private BigDecimal declaredCostValue = BigDecimal.ZERO;
    @Builder.Default
    private Integer totalQuantity = 0;
    private BigDecimal importCost;
    @Builder.Default
    private BigDecimal totalCostValue = BigDecimal.ZERO;
    @Builder.Default
    private ImportBatchLineStatus status = ImportBatchLineStatus.OPEN;
    private LocalDateTime importedAt;
    private String cancelReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isCancelled() {
        return status == ImportBatchLineStatus.CANCELLED;
    }

    public boolean isTerminal() {
        return status == ImportBatchLineStatus.IMPORTED || status == ImportBatchLineStatus.CANCELLED;
    }

    public boolean isEditable() {
        return !isDeleted()
                && (status == ImportBatchLineStatus.OPEN || status == ImportBatchLineStatus.IMPORTING);
    }

    public boolean isDeletable() {
        return !isDeleted()
                && (status == ImportBatchLineStatus.OPEN
                || status == ImportBatchLineStatus.IMPORTING
                || status == ImportBatchLineStatus.CANCELLED);
    }

    public boolean isExemptFromAutoCancellation() {
        return batchType == ImportBatchType.ADJUSTMENT;
    }

    public void markCancelled(LocalDateTime now, String cancelReason) {
        this.status = ImportBatchLineStatus.CANCELLED;
        this.cancelReason = cancelReason;
        this.updatedAt = now;
    }

    public void softDelete(LocalDateTime now) {
        this.deletedAt = now;
        this.updatedAt = now;
    }

    public void applyResolvedBatchType(ImportBatchType resolvedBatchType) {
        if (resolvedBatchType == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_BATCH_TYPE);
        }
        this.batchType = resolvedBatchType;
    }

    public boolean requiresInvoiceEvidence() {
        return batchType == ImportBatchType.NEW || batchType == ImportBatchType.LATE_IMPORT;
    }

    public boolean isImportComplete() {
        int declared = declareQuantity != null ? declareQuantity : 0;
        int imported = totalQuantity != null ? totalQuantity : 0;
        return declared > 0 && imported >= declared;
    }

    public void recalculateDeclaredCostValue() {
        int quantity = declareQuantity != null ? declareQuantity : 0;
        BigDecimal cost = importCost != null ? importCost : BigDecimal.ZERO;
        this.declaredCostValue = cost.multiply(BigDecimal.valueOf(quantity));
    }

    public void recalculateTotalCostValue() {
        int quantity = totalQuantity != null ? totalQuantity : 0;
        BigDecimal cost = importCost != null ? importCost : BigDecimal.ZERO;
        this.totalCostValue = cost.multiply(BigDecimal.valueOf(quantity));
    }

    public void updateImportProgress(int importedCount, LocalDateTime now) {
        this.totalQuantity = importedCount;
        recalculateTotalCostValue();

        int declared = declareQuantity != null ? declareQuantity : 0;
        if (declared > 0 && importedCount >= declared) {
            this.status = ImportBatchLineStatus.IMPORTED;
            if (this.importedAt == null) {
                this.importedAt = now;
            }
            return;
        }
        if (importedCount > 0) {
            this.status = ImportBatchLineStatus.IMPORTING;
            return;
        }
        this.status = ImportBatchLineStatus.OPEN;
        this.importedAt = null;
    }
}
