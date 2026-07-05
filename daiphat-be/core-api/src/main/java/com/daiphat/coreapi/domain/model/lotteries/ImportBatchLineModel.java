package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
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
    private Integer totalQuantity = 0;
    private BigDecimal importCost;
    @Builder.Default
    private BigDecimal totalCostValue = BigDecimal.ZERO;
    private String invoiceEvidenceUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

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

    public boolean isImportComplete() {
        int declared = declareQuantity != null ? declareQuantity : 0;
        int imported = totalQuantity != null ? totalQuantity : 0;
        return declared > 0 && imported >= declared;
    }

    public void recalculateTotalCostValue() {
        int quantity = totalQuantity != null ? totalQuantity : 0;
        BigDecimal cost = importCost != null ? importCost : BigDecimal.ZERO;
        this.totalCostValue = cost.multiply(BigDecimal.valueOf(quantity));
    }
}
