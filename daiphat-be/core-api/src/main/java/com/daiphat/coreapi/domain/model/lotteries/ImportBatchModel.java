package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
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
    private LocalDate drawDate;
    private Long supplierId;
    private String supplierName;
    private UUID importedBy;
    private LocalDateTime importedAt;
    @Builder.Default
    private ImportBatchStatus status = ImportBatchStatus.DRAFT;
    @Builder.Default
    private List<ImportBatchLineModel> lines = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate(UUID operatorId) {
        this.importedBy = operatorId;
        this.importedAt = LocalDateTime.now();
        this.status = ImportBatchStatus.DRAFT;
        if (lines == null) {
            lines = new ArrayList<>();
        }
    }

    public int getTotalDeclareQuantity() {
        return lines.stream()
                .mapToInt(line -> line.getDeclareQuantity() != null ? line.getDeclareQuantity() : 0)
                .sum();
    }

    public BigDecimal getTotalDeclaredCostValue() {
        return lines.stream()
                .map(line -> {
                    int qty = line.getDeclareQuantity() != null ? line.getDeclareQuantity() : 0;
                    BigDecimal cost = line.getImportCost() != null ? line.getImportCost() : BigDecimal.ZERO;
                    return cost.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public boolean areAllLinesImportComplete() {
        return !lines.isEmpty() && lines.stream().allMatch(ImportBatchLineModel::isImportComplete);
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
