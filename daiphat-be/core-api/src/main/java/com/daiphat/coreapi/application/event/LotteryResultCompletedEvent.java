package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.time.LocalDate;

@Builder
public record LotteryResultCompletedEvent(
        Long resultId,
        Long stationId,
        String stationName,
        LocalDate drawDate
) {
}
