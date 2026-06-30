package com.daiphat.coreapi.domain.model.enums.chat;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AssigneeType implements LabeledEnum {
    AI_BOT("AI Bot"),
    HUMAN_OPERATOR("Human Operator");

    private final String label;
}
