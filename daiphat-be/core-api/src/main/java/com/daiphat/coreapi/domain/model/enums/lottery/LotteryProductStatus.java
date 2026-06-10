package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.*;

@Getter
@RequiredArgsConstructor
public enum LotteryProductStatus {
    DRAFT("Draft - Entered by Operator, pending approval"),
    PENDING_APPROVAL("Pending Admin approval"),
    ACTIVE("Active"),
    INACTIVE("Inactive");

    private final String displayName;
}