package com.daiphat.coreapi.domain.model.enums.order;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketIncidentOutcome implements LabeledEnum {
    REPLACED("Đã đổi vé"),
    NO_REPLACEMENT("Hết vé thay thế");

    private final String label;
}
