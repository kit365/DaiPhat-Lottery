package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportBatchModel {

    private Long id;
    private LocalDate drawDate;
    private Long supplierId;
    private String supplierName;
    private Long supplierSettlementId;
    private ImportBatchImportMode importMode;
    private String invoiceEvidenceUrl;
    private UUID importedBy;
    private LocalDateTime importedAt;
    @Builder.Default
    private ImportBatchStatus status = ImportBatchStatus.DRAFT;
    @Builder.Default
    private Integer lineCount = 0;
    @Builder.Default
    private Integer totalDeclareQuantity = 0;
    @Builder.Default
    private BigDecimal totalDeclaredCostValue = BigDecimal.ZERO;
    @Builder.Default
    private Integer totalImportedQuantity = 0;
    @Builder.Default
    private BigDecimal totalImportedCostValue = BigDecimal.ZERO;
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private LocalDateTime ledgerAt;
    private String note;
    @Builder.Default
    private List<ImportBatchLineModel> lines = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate(UUID operatorId, LocalDateTime now) {
        this.importedBy = operatorId;
        this.importedAt = now;
        this.status = ImportBatchStatus.DRAFT;
        if (lines == null) {
            lines = new ArrayList<>();
        }
    }

    public void markSubmitted(LocalDateTime now) {
        this.submittedAt = now;
    }

    public void recalculateAggregates() {
        if (lines == null || lines.isEmpty()) {
            lineCount = 0;
            totalDeclareQuantity = 0;
            totalDeclaredCostValue = BigDecimal.ZERO;
            totalImportedQuantity = 0;
            totalImportedCostValue = BigDecimal.ZERO;
            return;
        }

        lineCount = lines.size();
        totalDeclareQuantity = lines.stream()
                .mapToInt(line -> line.getDeclareQuantity() != null ? line.getDeclareQuantity() : 0)
                .sum();
        totalDeclaredCostValue = lines.stream()
                .map(line -> line.getDeclaredCostValue() != null ? line.getDeclaredCostValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        totalImportedQuantity = lines.stream()
                .mapToInt(line -> line.getTotalQuantity() != null ? line.getTotalQuantity() : 0)
                .sum();
        totalImportedCostValue = lines.stream()
                .map(line -> line.getTotalCostValue() != null ? line.getTotalCostValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public boolean areAllLinesImportComplete() {
        return !lines.isEmpty() && lines.stream().allMatch(ImportBatchLineModel::isImportComplete);
    }

    public void validateInvoiceEvidence() {
        if (importMode != ImportBatchImportMode.IN_DAY) {
            return;
        }
        boolean requiresInvoice = lines != null && lines.stream()
                .anyMatch(ImportBatchLineModel::requiresInvoiceEvidence);
        if (!requiresInvoice) {
            return;
        }
        if (invoiceEvidenceUrl == null || invoiceEvidenceUrl.isBlank()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVOICE_REQUIRED);
        }
    }

    public void markImported(LocalDateTime now) {
        ensureStatus(ImportBatchStatus.DRAFT);
        this.status = ImportBatchStatus.IMPORTED;
        this.completedAt = now;
    }

    private void ensureStatus(ImportBatchStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }
    }
}
