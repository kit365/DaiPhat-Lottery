package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;

import java.time.LocalDate;

public interface LotteryResultSourceServicePort {

    LotteryResultSourcePreviewResult preview(LotteryStationSourceType sourceType, Long stationId, LocalDate drawDate);
}
