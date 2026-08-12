package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.streetagent.VendorDailyReportFinalizationUseCase;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class VendorDailySalesReportFinalizationScheduler {

    private final VendorDailyReportFinalizationUseCase vendorDailyReportFinalizationUseCase;

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void finalizeYesterdayReports() {
        LocalDate today = LocalDate.now(DrawScheduleUtils.VIETNAM_ZONE);
        int finalized = vendorDailyReportFinalizationUseCase.finalizeOverdueReports(today);
        if (finalized > 0) {
            log.info("Finalized {} overdue vendor daily sales reports", finalized);
        }
    }
}
