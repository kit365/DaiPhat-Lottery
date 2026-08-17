package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementReconciliationPhase {
    MATCHING("Đối chiếu số liệu"),
    DISCREPANCY_DETECTED("Phát hiện chênh lệch"),
    RESOLVING_IMPORT_DISCREPANCY("Xử lý chênh lệch nhập"),
    RESOLVING_RETURN_DISCREPANCY("Xử lý chênh lệch trả"),
    READY_FOR_RECALCULATION("Sẵn sàng tính lại"),
    RECALCULATED("Đã tính lại"),
    PAYMENT_DISCREPANCY("Chênh lệch thanh toán"),
    COMPLETED("Hoàn tất đối soát");

    private final String label;
}
