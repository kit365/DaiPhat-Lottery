package com.daiphat.coreapi.application.dto.chat.schedule;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

public record ChatScheduleFuzzyCandidate(
        LotteryStationModel station,
        double score
) {
}
