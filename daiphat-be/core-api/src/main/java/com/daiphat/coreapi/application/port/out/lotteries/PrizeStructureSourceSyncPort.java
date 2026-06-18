package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;

public interface PrizeStructureSourceSyncPort {

    PrizeStructureSourcePreviewResult preview(LotteryStationSourceType sourceType, String region);
}
