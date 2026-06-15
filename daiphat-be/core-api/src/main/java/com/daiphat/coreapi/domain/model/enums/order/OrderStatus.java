package com.daiphat.coreapi.domain.model.enums.order;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderStatus implements LabeledEnum {
    PENDING_PAYMENT("Chờ thanh toán"),
    PAID("Đã thanh toán"),
    PREPARING("Đang chuẩn bị vé"),
    PENDING_PICKUP("Chờ khách đến lấy"),
    COMPLETED("Hoàn tất"),
    CANCELLED("Đã hủy");

    private final String label;
}
