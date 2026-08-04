package com.daiphat.coreapi.application.dto.response.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;

import java.time.LocalTime;

@Builder
public record LotteryRegionResponse(
        Long id,
        String code,
        String name,
        String type,
        Integer minNumber,
        Integer maxNumber,
        Integer minLength,
        Integer maxLength,
        Integer numberLength,
        Integer stationCount,
        @JsonFormat(pattern = "HH:mm")
        LocalTime defaultDrawTime
) {
}
