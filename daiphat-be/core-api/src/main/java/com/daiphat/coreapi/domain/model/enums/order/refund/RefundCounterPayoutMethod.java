package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** How staff paid out a MANUAL_RESOLUTION refund to the customer at the counter. */
@Getter
@RequiredArgsConstructor
public enum RefundCounterPayoutMethod implements LabeledEnum {
    CASH("Tiền mặt"),
    TRANSFER("Chuyển khoản");

    private final String label;
}
