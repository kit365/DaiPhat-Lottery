package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import lombok.Builder;

@Builder
public record LotteryStationSyncItemResponse(
        Long stationId,
        String name,
        String canonicalName,
        SyncAction action,
        String note
) {
}
