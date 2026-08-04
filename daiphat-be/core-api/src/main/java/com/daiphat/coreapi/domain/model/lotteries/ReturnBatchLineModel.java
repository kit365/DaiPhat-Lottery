package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
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
public class ReturnBatchLineModel {

    private Long id;
    private Long returnBatchId;
    private Long lotteryStationId;
    private String lotteryStationName;
    @Builder.Default
    private ReturnBatchLineStatus status = ReturnBatchLineStatus.PENDING;
    @Builder.Default
    private Integer totalQuantity = 0;
    @Builder.Default
    private BigDecimal totalReturnValue = BigDecimal.ZERO;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public void applyQuantityAndUnitCost(int quantity, BigDecimal unitCost) {
        this.totalQuantity = Math.max(quantity, 0);
        BigDecimal cost = unitCost != null ? unitCost : BigDecimal.ZERO;
        this.totalReturnValue = ImportCostCalculator.scaleMoney(
                cost.multiply(BigDecimal.valueOf(this.totalQuantity))
        );
    }
}
