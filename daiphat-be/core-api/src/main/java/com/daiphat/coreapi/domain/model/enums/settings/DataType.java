package com.daiphat.coreapi.domain.model.enums.settings;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DataType implements LabeledEnum {
    STRING("Chuỗi"),
    INTEGER("Số nguyên"),
    BOOLEAN("Đúng/Sai"),
    JSON("JSON");

    private final String label;
}
