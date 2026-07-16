package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryTicketExpireScheduler {

    private final LotteryTicketServicePort lotteryTicketServicePort;

    @Scheduled(cron = "${daiphat.lottery.expire-cron}")
    public void expireDueTickets() {
        int expiredCount = lotteryTicketServicePort.expireDueTickets();
        if (expiredCount > 0) {
            log.info("Expired {} lottery tickets", expiredCount);
        } else {
            log.debug("No lottery tickets due for expiration");
        }
    }
}
