package com.daiphat.coreapi.domain.model.enums.order;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderReceiveType implements LabeledEnum {
    COUNTER_PICKUP("Nhận vé tại quầy");

    private final String label;
}
