package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementStatus {
    OPEN("Đang mở"),
    CLOSED("Đã chốt");

    private final String label;
}
