package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryStationDrawReminderScheduler {

    private final LotteryStationServicePort lotteryStationServicePort;

    @Scheduled(cron = "${daiphat.lottery.draw-reminder-cron:0 * * * * *}")
    public void sendUpcomingDrawReminders() {
        int notifiedCount = lotteryStationServicePort.sendUpcomingDrawReminderNotifications();
        if (notifiedCount > 0) {
            log.info("Sent upcoming draw reminder notifications for {} lottery stations", notifiedCount);
        }
    }
}
