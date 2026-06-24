package com.daiphat.coreapi.domain.model.enums.settings;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DataType implements LabeledEnum {
    INT("Số nguyên"),
    TIME("Thời gian (HH:mm)");

    private final String label;
}
