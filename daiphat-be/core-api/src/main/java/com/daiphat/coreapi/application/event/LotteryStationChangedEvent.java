package com.daiphat.coreapi.application.event;

import lombok.Builder;

@Builder
public record LotteryStationChangedEvent(Long stationId) {
}
