package com.daiphat.coreapi.domain.model.enums.settings;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConfigType implements LabeledEnum {
    SYSTEM("Hệ thống"),
    BOOKING("Đặt vé / Giao hàng"),
    PAYMENT("Thanh toán");

    private final String label;
}
