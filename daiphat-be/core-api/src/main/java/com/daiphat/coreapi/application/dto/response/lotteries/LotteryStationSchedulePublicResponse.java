package com.daiphat.coreapi.application.dto.response.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;

import java.time.LocalTime;
import java.util.List;

@Builder
public record LotteryStationSchedulePublicResponse(
        Long stationId,
        String stationName,
        String region,
        List<String> drawDays,
        List<String> drawDaysDisplay,
        @JsonFormat(pattern = "HH:mm")
        LocalTime drawTime
) {}
