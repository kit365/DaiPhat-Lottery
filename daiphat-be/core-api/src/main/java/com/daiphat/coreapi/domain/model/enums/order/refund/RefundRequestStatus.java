package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RefundRequestStatus implements LabeledEnum {
    WAITING_FOR_INFO("Chờ thông tin STK"),
    /** @deprecated Prefer READY_TO_PAY; kept for legacy rows during rollout. */
    @Deprecated
    APPROVED("Đã duyệt"),
    READY_TO_PAY("Chờ chuyển khoản"),
    @Deprecated
    TRANSFERRED("Đã chuyển khoản"),
    PAID("Đã chuyển khoản"),
    MANUAL_RESOLUTION("Cần xử lý thủ công"),
    EXPIRED("Hết hạn"),
    CANCELLED("Đã hủy");

    private final String label;
}
