package com.daiphat.coreapi.application.dto.chat.schedule;

import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleStationMatchSource;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

public record ChatScheduleStationMatchResult(
        LotteryStationModel station,
        ChatScheduleStationMatchSource source
) {
}
