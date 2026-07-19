package com.daiphat.coreapi.application.service.lotteries.result;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultSourceServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultSourceSyncPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class LotteryResultSourceService implements LotteryResultSourceServicePort {

    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryResultSourceSyncPort lotteryResultSourceSyncPort;

    @Override
    // External HTTP fetch must not join the sync TX — a nested TX marks rollback-only when
    // empty/invalid source throws DomainException, even if syncResult catches and handles it.
    public LotteryResultSourcePreviewResult preview(LotteryStationSourceType sourceType, Long stationId, LocalDate drawDate) {
        if (stationId == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_STATION_REQUIRED);
        }
        if (drawDate == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
        }

        LotteryStationModel station = lotteryStationServicePort.findModelById(stationId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));

        return lotteryResultSourceSyncPort.preview(
                sourceType,
                station.getName(),
                station.getRegion() != null ? station.getRegion().region() : null,
                drawDate
        );
    }
}
