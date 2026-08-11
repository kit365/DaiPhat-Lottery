package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementAdjustmentGroupType {
    IMPORT("Nhập"),
    RETURN("Trả"),
    SETTLEMENT("Thanh toán");

    private final String label;
}
