package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementStatus {
    OPEN("Đang mở"),
    RECEIPT_OVERDUE("Trễ hạn thanh toán"),
    COMPLETED("Đã thanh toán");

    private final String label;
}
