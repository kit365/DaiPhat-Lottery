package com.daiphat.coreapi.domain.model.enums.support;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketRefType implements LabeledEnum {
    ORDER("Đơn hàng"),
    PAYMENT_TRANSACTION("Giao dịch thanh toán"),
    PRIZE_CLAIM("Yêu cầu nhận thưởng");

    private final String label;
}
