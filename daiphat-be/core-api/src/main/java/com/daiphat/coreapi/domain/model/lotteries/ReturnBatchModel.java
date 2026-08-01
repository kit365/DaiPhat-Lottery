package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
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
public class ReturnBatchModel {

    private Long id;
    private Long lotterySupplierId;
    private String supplierName;
    private String supplierCode;
    private LocalDate drawDate;
    private Long supplierSettlementId;
    private String returnReceiptUrl;
    private com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode deliveryMode;
    @Builder.Default
    private Integer totalQuantity = 0;
    @Builder.Default
    private BigDecimal totalReturnValue = BigDecimal.ZERO;
    private UUID returnedBy;
    private LocalDateTime returnedAt;
    private LocalDateTime confirmedAt;
    @Builder.Default
    private ReturnBatchStatus status = ReturnBatchStatus.PENDING;
    private String note;
    @Builder.Default
    private List<ReturnBatchLineModel> lines = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public void recalculateAggregates() {
        int qty = 0;
        BigDecimal value = BigDecimal.ZERO;
        if (lines != null) {
            for (ReturnBatchLineModel line : lines) {
                if (line == null || line.getDeletedAt() != null) {
                    continue;
                }
                qty += line.getTotalQuantity() != null ? line.getTotalQuantity() : 0;
                if (line.getTotalReturnValue() != null) {
                    value = value.add(line.getTotalReturnValue());
                }
            }
        }
        this.totalQuantity = qty;
        this.totalReturnValue = ImportCostCalculator.scaleMoney(value);
    }

    public boolean isEditable() {
        return status == ReturnBatchStatus.PENDING || status == ReturnBatchStatus.RETURNED;
    }
}
