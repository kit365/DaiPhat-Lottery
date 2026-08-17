package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
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
    private String batchCode;
    private LocalDate drawDate;
    private Long supplierId;
    private String supplierName;
    private Long supplierSettlementId;
    private ImportBatchImportMode importMode;
    private String invoiceEvidenceUrl;
    @Builder.Default
    private List<String> ticketListImageUrls = new ArrayList<>();
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
    private String cancelReason;
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

    public List<ImportBatchLineModel> getActiveLines() {
        if (lines == null) {
            return List.of();
        }
        return lines.stream()
                .filter(line -> line.getDeletedAt() == null)
                .toList();
    }

    public void recalculateAggregates() {
        List<ImportBatchLineModel> activeLines = getActiveLines();
        if (activeLines.isEmpty()) {
            lineCount = 0;
            totalDeclaredCostValue = BigDecimal.ZERO;
            totalImportedQuantity = 0;
            totalImportedCostValue = BigDecimal.ZERO;
            return;
        }

        lineCount = activeLines.size();
        totalDeclaredCostValue = activeLines.stream()
                .map(line -> line.getDeclaredCostValue() != null ? line.getDeclaredCostValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(com.daiphat.coreapi.shared.util.ImportCostCalculator.COST_SCALE,
                        com.daiphat.coreapi.shared.util.ImportCostCalculator.COST_ROUNDING);
        totalImportedQuantity = activeLines.stream()
                .mapToInt(line -> line.getTotalQuantity() != null ? line.getTotalQuantity() : 0)
                .sum();
        totalImportedCostValue = activeLines.stream()
                .map(line -> line.getTotalCostValue() != null ? line.getTotalCostValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(com.daiphat.coreapi.shared.util.ImportCostCalculator.COST_SCALE,
                        com.daiphat.coreapi.shared.util.ImportCostCalculator.COST_ROUNDING);
    }

    public boolean areAllLinesImportComplete() {
        return areAllLinesImported();
    }

    public boolean areAllLinesImported() {
        List<ImportBatchLineModel> nonCancelledLines = getNonCancelledActiveLines();
        return !nonCancelledLines.isEmpty()
                && nonCancelledLines.stream()
                .allMatch(line -> line.getStatus() == ImportBatchLineStatus.IMPORTED);
    }

    public boolean hasAnyFullyImportedLine() {
        return getActiveLines().stream()
                .anyMatch(line -> line.getStatus() == ImportBatchLineStatus.IMPORTED);
    }

    private List<ImportBatchLineModel> getNonCancelledActiveLines() {
        return getActiveLines().stream()
                .filter(line -> !line.isCancelled())
                .toList();
    }

    public boolean areAllActiveLinesCancelled() {
        List<ImportBatchLineModel> activeLines = getActiveLines();
        return !activeLines.isEmpty()
                && activeLines.stream().allMatch(ImportBatchLineModel::isCancelled);
    }

    public boolean isEditable() {
        return status == ImportBatchStatus.DRAFT
                || status == ImportBatchStatus.RECEIVING
                || status == ImportBatchStatus.PARTIALLY_IMPORTED;
    }

    public void validateInvoiceEvidence() {
        if (importMode != ImportBatchImportMode.IN_DAY) {
            return;
        }
        boolean requiresInvoice = getActiveLines().stream()
                .anyMatch(ImportBatchLineModel::requiresInvoiceEvidence);
        if (!requiresInvoice) {
            return;
        }
        if (invoiceEvidenceUrl == null || invoiceEvidenceUrl.isBlank()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVOICE_REQUIRED);
        }
    }

    public void markReceiving(LocalDateTime now) {
        if (status == ImportBatchStatus.DRAFT) {
            this.status = ImportBatchStatus.RECEIVING;
            this.updatedAt = now;
        }
    }

    public void markPartiallyImported(LocalDateTime now) {
        if (status == ImportBatchStatus.DRAFT
                || status == ImportBatchStatus.RECEIVING
                || status == ImportBatchStatus.PARTIALLY_IMPORTED) {
            this.status = ImportBatchStatus.PARTIALLY_IMPORTED;
            this.updatedAt = now;
        }
    }

    public void markImported(LocalDateTime now) {
        if (status != ImportBatchStatus.DRAFT
                && status != ImportBatchStatus.RECEIVING
                && status != ImportBatchStatus.PARTIALLY_IMPORTED) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }
        this.status = ImportBatchStatus.IMPORTED;
        this.completedAt = now;
        this.updatedAt = now;
    }

    public void refreshImportStatus(LocalDateTime now) {
        if (!isEditable()) {
            return;
        }
        if (areAllLinesImported()) {
            markImported(now);
            return;
        }

        if (hasAnyFullyImportedLine()) {
            markPartiallyImported(now);
            return;
        }

        boolean hasAnyImport = getActiveLines().stream()
                .anyMatch(line -> line.getTotalQuantity() != null && line.getTotalQuantity() > 0);
        if (hasAnyImport) {
            markReceiving(now);
        } else if (status == ImportBatchStatus.RECEIVING || status == ImportBatchStatus.PARTIALLY_IMPORTED) {
            this.status = ImportBatchStatus.DRAFT;
            this.updatedAt = now;
        }
    }

    public boolean isSubjectToSameDayCutoffCancellation(LocalDate today) {
        return isEditable()
                && !isExemptFromAutoCancellation()
                && importMode == ImportBatchImportMode.IN_DAY
                && drawDate != null
                && drawDate.equals(today);
    }

    public boolean isExemptFromAutoCancellation() {
        return importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT;
    }

    public void markCancelled(LocalDateTime now, String cancelReason) {
        if (!isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }
        this.status = ImportBatchStatus.CANCELLED;
        this.cancelReason = cancelReason;
        this.updatedAt = now;
    }

    public boolean hasExpiredDrawDate(LocalDate today) {
        return drawDate != null && drawDate.isBefore(today);
    }
}
