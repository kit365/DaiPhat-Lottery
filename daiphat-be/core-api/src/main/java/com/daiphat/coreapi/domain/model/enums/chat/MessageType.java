package com.daiphat.coreapi.domain.model.enums.chat;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MessageType implements LabeledEnum {
    TEXT("Tin nhắn thường"),
    IMAGE("Hình ảnh"),
    FILE("Tệp đính kèm"),
    SYSTEM("Tin nhắn hệ thống");

    private final String label;
}
