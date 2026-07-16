package com.daiphat.coreapi.domain.model.enums.order;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketIncidentReason implements LabeledEnum {
    DAMAGED("Vé rách"),
    LOST("Thất lạc");

    private final String label;
}
