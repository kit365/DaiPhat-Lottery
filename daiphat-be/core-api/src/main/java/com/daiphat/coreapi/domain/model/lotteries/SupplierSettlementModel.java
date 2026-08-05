package com.daiphat.coreapi.domain.model.lotteries;

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
    @Builder.Default
    private BigDecimal totalImportValue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalReturnValue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalPaidAmount = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal remainingAmount = BigDecimal.ZERO;
    @Builder.Default
    private boolean isReturnExpired = false;
    @Builder.Default
    private BigDecimal expiredReturnValue = BigDecimal.ZERO;
    @Builder.Default
    private SupplierSettlementStatus status = SupplierSettlementStatus.OPEN;
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
}
