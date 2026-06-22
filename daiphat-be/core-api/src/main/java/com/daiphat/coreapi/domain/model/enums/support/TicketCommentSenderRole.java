package com.daiphat.coreapi.domain.model.enums.support;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketCommentSenderRole implements LabeledEnum {
    CUSTOMER("Khách hàng"),
    OPERATOR("Nhân viên"),
    SYSTEM("Hệ thống");

    private final String label;
}
