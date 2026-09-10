package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementStatus {
    OPEN("Đang mở"),
    RECEIPT_OVERDUE("Trễ hạn thanh toán"),
    /** Legacy DB value before rename to {@link #COMPLETED}. */
    @Deprecated
    CLOSED("Đã thanh toán"),
    COMPLETED("Đã thanh toán");

    private final String label;

    public boolean isCompleted() {
        return this == COMPLETED || this == CLOSED;
    }
}
