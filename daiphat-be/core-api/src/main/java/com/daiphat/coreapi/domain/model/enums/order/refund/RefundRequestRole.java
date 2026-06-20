package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RefundRequestRole implements LabeledEnum {
    CUSTOMER("Khách hàng"),
    STAFF("Nhân viên"),
    ADMIN("Quản trị viên");

    private final String label;
}
