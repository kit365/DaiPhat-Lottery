package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementDiscrepancyType {
    IMPORT_UNIT_PRICE("Chênh lệch giá nhập mỗi vé"),
    IMPORT_QUANTITY("Chênh lệch số lượng nhập"),
    RETURN_QUANTITY("Chênh lệch số lượng trả");

    private final String label;
}
