package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;

import java.time.LocalDate;

public interface LotteryResultSourceSyncPort {

    LotteryResultSourcePreviewResult preview(
            LotteryStationSourceType sourceType,
            String stationName,
            String region,
            LocalDate drawDate
    );
}
