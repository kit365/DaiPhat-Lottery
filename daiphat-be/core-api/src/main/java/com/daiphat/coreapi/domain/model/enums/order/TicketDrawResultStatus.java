package com.daiphat.coreapi.domain.model.enums.order;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketDrawResultStatus {
    PENDING_DRAW("Chờ xổ"),
    WON("Trúng thưởng"),
    LOST("Không trúng");

    private final String displayName;
}
