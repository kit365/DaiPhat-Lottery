package com.daiphat.coreapi.domain.model.enums.order.detail;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderDetailStatus implements LabeledEnum {
    ACTIVE("Đang hiệu lực"),
    INACTIVE("Không còn hiệu lực"),
    REFUND_PENDING("Chờ hoàn tiền"),
    REFUNDED("Đã hoàn tiền");

    private final String label;
}
