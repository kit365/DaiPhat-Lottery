package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.service.lotteries.AiModelPlatformService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiModelMetricAggregationScheduler {

    private final AiModelPlatformService aiModelPlatformService;

    @Scheduled(cron = "${daiphat.ocr.ai-model-metric-cron:0 15 2 * * *}")
    public void aggregateYesterdayMetrics() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        int upserted = aiModelPlatformService.aggregateMetricsForDate(yesterday);
        if (upserted > 0) {
            log.info("Aggregated {} AI model metric rows for {}", upserted, yesterday);
        } else {
            log.debug("No AI model metrics to aggregate for {}", yesterday);
        }
    }
}
