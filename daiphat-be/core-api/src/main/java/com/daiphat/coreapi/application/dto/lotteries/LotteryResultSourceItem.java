package com.daiphat.coreapi.application.dto.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record LotteryResultSourceItem(
        String prizeLevel,
        String prizeDisplayName,
        String prizeCode,
        Integer displayOrder,
        List<String> winningNumbers,
        String note
) {
}
