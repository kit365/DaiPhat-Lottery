package com.daiphat.coreapi.application.event;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;

public record LotteryResultSyncRequestedEvent(
        Long resultId,
        LotteryStationSourceType sourceType
) {
}
