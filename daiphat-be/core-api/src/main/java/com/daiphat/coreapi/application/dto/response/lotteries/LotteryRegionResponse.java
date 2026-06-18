package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record LotteryRegionResponse(
        Long id,
        String code,
        String name,
        String type,
        Integer minNumber,
        Integer maxNumber,
        Integer numberLength,
        Integer stationCount
) {
}
