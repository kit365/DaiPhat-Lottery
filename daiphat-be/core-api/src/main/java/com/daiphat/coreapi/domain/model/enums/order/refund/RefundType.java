package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RefundType implements LabeledEnum {
    FULL_ORDER("Hoàn cả đơn"),
    ORDER_DETAIL("Hoàn từng vé");

    private final String label;
}
