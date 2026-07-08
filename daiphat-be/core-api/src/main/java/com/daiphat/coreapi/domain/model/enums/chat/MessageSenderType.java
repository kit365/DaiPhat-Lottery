package com.daiphat.coreapi.domain.model.enums.chat;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MessageSenderType implements LabeledEnum {
    CUSTOMER("Khách hàng"),
    OPERATOR("Operator"),
    AI_SYSTEM("AI System");

    private final String label;
}
