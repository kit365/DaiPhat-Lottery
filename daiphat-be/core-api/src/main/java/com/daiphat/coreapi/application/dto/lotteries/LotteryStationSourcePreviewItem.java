package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record LotteryStationSourcePreviewItem(
        String name,
        String canonicalName,
        String region,
        String drawTime,
        List<String> drawDays,
        String sourcePath,
        String note
) {
}
