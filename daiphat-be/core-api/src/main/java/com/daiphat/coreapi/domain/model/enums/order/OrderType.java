package com.daiphat.coreapi.domain.model.enums.order;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderType implements LabeledEnum {
    DIRECT("Đặt tại quầy"),
    ONLINE("Đặt trực tuyến");

    private final String label;
}
