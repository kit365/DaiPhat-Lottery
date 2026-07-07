package com.daiphat.coreapi.application.dto.chat.schedule;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

public record ChatScheduleStationRef(
        Long id,
        String name,
        String normalizedName,
        LotteryStationModel model
) {
}
