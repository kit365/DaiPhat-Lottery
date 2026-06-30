package com.daiphat.coreapi.domain.model.enums.chat;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ParticipationRole implements LabeledEnum {
    CUSTOMER("Khách hàng"),
    OPERATOR("Operator"),
    SUPERVISOR("Supervisor");

    private final String label;
}
