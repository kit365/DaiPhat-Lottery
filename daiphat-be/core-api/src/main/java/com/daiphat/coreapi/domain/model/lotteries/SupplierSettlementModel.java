package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
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
public class SupplierSettlementModel {

    private Long id;
    private Long lotterySupplierId;
    private String supplierName;
    private String supplierCode;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String supplierSettlementCode;
    @Builder.Default
    private BigDecimal totalImportValue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalReturnValue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalPaidAmount = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal remainingAmount = BigDecimal.ZERO;
    private String supplierSettlementReceiptUrl;
    @Builder.Default
    private boolean isReturnExpired = false;
    @Builder.Default
    private BigDecimal expiredReturnValue = BigDecimal.ZERO;
    @Builder.Default
    private SupplierSettlementStatus status = SupplierSettlementStatus.OPEN;
    @Builder.Default
    private SupplierSettlementReconciliationPhase reconciliationPhase = SupplierSettlementReconciliationPhase.MATCHING;

    private Integer systemImportQuantity;
    private BigDecimal systemImportValue;
    private Integer systemReturnQuantity;
    private BigDecimal systemReturnValue;
    private Integer actualTicketImportQuantity;
    private BigDecimal actualTicketImportValue;
    private Integer actualReturnTicketQuantity;
    private BigDecimal actualReturnTicketValue;
    private BigDecimal originalTicketUnitPrice;
    private BigDecimal reconciledTicketUnitPrice;
    private BigDecimal initialEstimatedSettlementValue;
    private BigDecimal finalSettlementValue;
    private BigDecimal actualPaidAmount;
    private BigDecimal settlementDifferenceAmount;
    @Builder.Default
    private List<SupplierSettlementDiscrepancyType> discrepancyTypes = new ArrayList<>();
    @Builder.Default
    private List<SettlementDiscrepancyItem> discrepancyItems = new ArrayList<>();

    @Builder.Default
    private boolean importQuantityMismatch = false;
    @Builder.Default
    private boolean importValueMismatch = false;
    @Builder.Default
    private boolean returnQuantityMismatch = false;
    @Builder.Default
    private boolean returnValueMismatch = false;
    @Builder.Default
    private boolean importDiscrepancyResolved = false;
    @Builder.Default
    private boolean returnDiscrepancyResolved = false;
    @Builder.Default
    private boolean unitPriceDiscrepancyResolved = true;

    private BigDecimal recalculatedTotalPaidAmount;
    private String reconciliationNote;
    private LocalDateTime matchingConfirmedAt;
    private UUID matchingConfirmedBy;
    private LocalDateTime completedAt;
    private UUID completedBy;

    private Long transactionId;
    private LocalDateTime paidAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public void applyTotalImportValue(BigDecimal totalImportValue) {
        this.totalImportValue = ImportCostCalculator.scaleMoney(totalImportValue);
    }

    public void applyTotalReturnValue(BigDecimal totalReturnValue) {
        this.totalReturnValue = ImportCostCalculator.scaleMoney(totalReturnValue);
    }

    public void applyExpiredReturnValue(BigDecimal expiredReturnValue) {
        this.expiredReturnValue = ImportCostCalculator.scaleMoney(expiredReturnValue);
    }

    public void applyRemainingAmount(BigDecimal remainingAmount) {
        this.remainingAmount = ImportCostCalculator.scaleMoney(remainingAmount);
    }

    public void applyRecalculatedTotalPaidAmount(BigDecimal amount) {
        this.recalculatedTotalPaidAmount = ImportCostCalculator.scaleMoney(amount);
    }

    public void applyActualPaidAmount(BigDecimal amount) {
        this.actualPaidAmount = ImportCostCalculator.scaleMoney(amount);
    }

    public void freezeInitialEstimatedSettlementValue(BigDecimal initialEstimated) {
        if (this.initialEstimatedSettlementValue == null && initialEstimated != null) {
            this.initialEstimatedSettlementValue = ImportCostCalculator.scaleMoney(initialEstimated);
        }
    }

    public void applyFinalSettlementValue(BigDecimal finalValue) {
        this.finalSettlementValue = ImportCostCalculator.scaleMoney(finalValue);
        BigDecimal initial = this.initialEstimatedSettlementValue != null
                ? this.initialEstimatedSettlementValue
                : BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
        this.settlementDifferenceAmount = ImportCostCalculator.scaleMoney(
                this.finalSettlementValue.subtract(initial)
        );
    }

    /** Clears adjusted settlement amount when there is no reconciliation discrepancy. */
    public void clearFinalSettlementValue() {
        this.finalSettlementValue = null;
        this.settlementDifferenceAmount = BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
    }

    /** Sets baseline once, then always refreshes final + signed difference. */
    public void applySettlementValueTrio(BigDecimal initialEstimated, BigDecimal finalValue) {
        freezeInitialEstimatedSettlementValue(initialEstimated);
        applyFinalSettlementValue(finalValue);
    }

    public SettlementDiscrepancyItem findDiscrepancyItem(SupplierSettlementDiscrepancyType type) {
        if (type == null || discrepancyItems == null) {
            return null;
        }
        return discrepancyItems.stream()
                .filter(item -> item != null && item.getType() == type)
                .findFirst()
                .orElse(null);
    }

    public boolean hasDiscrepancyType(SupplierSettlementDiscrepancyType type) {
        if (type == null) {
            return false;
        }
        if (discrepancyTypes != null && !discrepancyTypes.isEmpty()) {
            return discrepancyTypes.contains(type);
        }
        return switch (type) {
            case IMPORT_QUANTITY -> importQuantityMismatch;
            case RETURN_QUANTITY -> returnQuantityMismatch;
            case IMPORT_UNIT_PRICE -> importValueMismatch && !importQuantityMismatch;
        };
    }

    public boolean needsImportResolution() {
        return hasDiscrepancyType(SupplierSettlementDiscrepancyType.IMPORT_QUANTITY) && !importDiscrepancyResolved;
    }

    public boolean needsReturnResolution() {
        return hasDiscrepancyType(SupplierSettlementDiscrepancyType.RETURN_QUANTITY) && !returnDiscrepancyResolved;
    }

    public boolean needsUnitPriceResolution() {
        return hasDiscrepancyType(SupplierSettlementDiscrepancyType.IMPORT_UNIT_PRICE) && !unitPriceDiscrepancyResolved;
    }

    public boolean hasUnresolvedDiscrepancies() {
        return needsImportResolution() || needsReturnResolution() || needsUnitPriceResolution();
    }

    public boolean hasReturnQuantityShortfall() {
        if (systemReturnQuantity == null || actualReturnTicketQuantity == null) {
            return false;
        }
        return systemReturnQuantity > actualReturnTicketQuantity;
    }
}
