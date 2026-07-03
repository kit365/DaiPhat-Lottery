package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportBatchModel {

    private Long id;
    private Long lotteryStationId;
    private Long supplierLedgerId;
    private ImportBatchType requestedBatchType;
    private ImportBatchType batchType;
    private String invoiceEvidenceUrl;
    private LocalDate drawDate;
    private Integer declareQuantity;
    @Builder.Default
    private Integer totalQuantity = 0;
    private BigDecimal importCost;
    @Builder.Default
    private BigDecimal totalCostValue = BigDecimal.ZERO;
    private UUID importedBy;
    private LocalDateTime importedAt;
    @Builder.Default
    private ImportBatchStatus status = ImportBatchStatus.DRAFT;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate(UUID operatorId) {
        this.importedBy = operatorId;
        this.importedAt = LocalDateTime.now();
        this.status = ImportBatchStatus.DRAFT;
        this.totalQuantity = 0;
        this.totalCostValue = BigDecimal.ZERO;
    }

    public void applyResolvedBatchType(ImportBatchType resolvedBatchType) {
        if (resolvedBatchType == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_BATCH_TYPE);
        }
        this.batchType = resolvedBatchType;
    }

    public void validateInvoiceEvidence() {
        if (!requiresInvoiceEvidence()) {
            return;
        }
        if (invoiceEvidenceUrl == null || invoiceEvidenceUrl.isBlank()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVOICE_REQUIRED);
        }
    }

    public boolean requiresInvoiceEvidence() {
        return batchType == ImportBatchType.NEW || batchType == ImportBatchType.LATE_IMPORT;
    }

    public void recalculateTotalCostValue() {
        int quantity = totalQuantity != null ? totalQuantity : 0;
        BigDecimal cost = importCost != null ? importCost : BigDecimal.ZERO;
        this.totalCostValue = cost.multiply(BigDecimal.valueOf(quantity));
    }

    public void markImported() {
        ensureStatus(ImportBatchStatus.DRAFT);
        this.status = ImportBatchStatus.IMPORTED;
    }

    private void ensureStatus(ImportBatchStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }
    }
}
