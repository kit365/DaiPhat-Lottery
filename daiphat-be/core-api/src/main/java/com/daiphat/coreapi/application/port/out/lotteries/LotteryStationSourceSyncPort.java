package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourcePreviewResult;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;

public interface LotteryStationSourceSyncPort {

    LotteryStationSourcePreviewResult preview(LotteryStationSourceType sourceType, String region);
}
