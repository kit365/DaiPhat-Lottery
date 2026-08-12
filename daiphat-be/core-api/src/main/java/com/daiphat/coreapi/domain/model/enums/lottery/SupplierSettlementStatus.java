package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementStatus {
    OPEN("Đang mở"),
    RECEIPT_OVERDUE("Quá hạn biên lai"),
    CLOSED("Đã chốt");

    private final String label;
}
