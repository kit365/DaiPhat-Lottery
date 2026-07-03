package com.daiphat.coreapi.domain.model.enums.chat;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConversationStatus implements LabeledEnum {
    OPEN("Mới tạo"),
    ACTIVE("Đang trao đổi"),
    WAITING_FOR_OPERATOR("Chờ operator"),
    WAITING_FOR_CUSTOMER("Chờ khách hàng"),
    CLOSED("Đã đóng");

    private final String label;
}
