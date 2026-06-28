package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import lombok.Builder;

@Builder
public record ResyncLotteryResultRequest(
        LotteryStationSourceType source
) {
}
