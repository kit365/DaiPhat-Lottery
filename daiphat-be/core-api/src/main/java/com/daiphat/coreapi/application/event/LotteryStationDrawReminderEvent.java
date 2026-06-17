package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.time.LocalTime;
import java.util.List;

@Builder
public record LotteryStationDrawReminderEvent(
        List<Long> stationIds,
        List<String> stationNames,
        LocalTime drawTime,
        long remainingMinutes
) {
}
