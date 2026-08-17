package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementAdjustmentReasonCode {
    MISSING_IMPORT("Thiếu vé khi nhập"),
    INSUFFICIENT_IMPORT("Nhập thiếu số lượng"),
    WRONG_DENOMINATION("Sai mệnh giá / giá trị"),
    EXCESS_IMPORT("Nhập thừa so với hệ thống"),
    MISSING_RETURN("Thiếu vé khi trả"),
    LOST_DURING_RETURN("Mất trong quá trình trả"),
    EXPIRED_UNRETURNED("Hết hạn không trả được"),
    EXCESS_RETURN("Trả thừa so với hệ thống"),
    SHIPPING_FEE("Phí vận chuyển"),
    LATE_PENALTY("Phạt chậm"),
    DISCOUNT("Chiết khấu / giảm trừ"),
    OTHER("Khác");

    private final String label;
}
