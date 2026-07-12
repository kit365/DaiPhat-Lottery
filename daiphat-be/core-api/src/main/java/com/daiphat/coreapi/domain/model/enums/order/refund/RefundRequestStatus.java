package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RefundRequestStatus implements LabeledEnum {
    PENDING("Chờ duyệt"),
    WAITING_FOR_INFO("Chờ thông tin STK"),
    APPROVED("Đã duyệt"),
    READY_TO_PAY("Chờ chuyển khoản"),
    @Deprecated
    TRANSFERRED("Đã chuyển khoản"),
    PAID("Đã chuyển khoản"),
    EXPIRED("Hết hạn"),
    CANCELLED("Đã hủy");

    private final String label;
}
