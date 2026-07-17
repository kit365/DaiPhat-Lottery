package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.support.SupportTicketServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SupportTicketAutoCloseScheduler {

    private final SupportTicketServicePort supportTicketServicePort;

    @Scheduled(fixedRateString = "${daiphat.support-ticket.auto-close-rate-ms:60000}")
    public void autoCloseResolvedTickets() {
        int closedCount = supportTicketServicePort.autoCloseResolvedTickets();
        if (closedCount > 0) {
            log.info("Auto-closed {} resolved support tickets", closedCount);
        }
    }
}
