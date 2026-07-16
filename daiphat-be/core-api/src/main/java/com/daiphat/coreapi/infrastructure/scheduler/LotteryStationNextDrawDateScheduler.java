package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryStationNextDrawDateScheduler {

    private final LotteryStationServicePort lotteryStationServicePort;

    @Scheduled(cron = "${daiphat.lottery.station-next-draw-recalculate-cron}")
    public void recalculateNextDrawDates() {
        int updatedCount = lotteryStationServicePort.recalculateNextDrawDates();
        log.info("Recalculated next draw date for {} lottery stations", updatedCount);
    }
}
