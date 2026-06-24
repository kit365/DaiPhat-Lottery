package com.daiphat.coreapi.domain.model.enums.settings;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConfigType implements LabeledEnum {
    ORDER_SETTING("Cấu hình đơn hàng"),
    REFUND_SETTING("Cấu hình hoàn tiền");

    private final String label;
}
