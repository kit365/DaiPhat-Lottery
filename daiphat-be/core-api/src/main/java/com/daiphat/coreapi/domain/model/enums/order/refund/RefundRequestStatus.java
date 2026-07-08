package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RefundRequestStatus implements LabeledEnum {
    PENDING("Chờ duyệt"),
    APPROVED("Đã duyệt"),
    REJECTED("Từ chối"),
    READY_TO_PAY("Chờ chuyển khoản"),
    @Deprecated
    TRANSFERRED("Đã chuyển khoản"),
    PAID("Đã chuyển khoản"),
    EXPIRED("Hết hạn"),
    CANCELLED("Đã hủy");

    private final String label;
}
