package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@Slf4j
public class LotteryResultSyncScheduler {

    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryResultServicePort lotteryResultServicePort;
    private final ThreadPoolTaskScheduler livePollingTaskScheduler;

    @Value("${daiphat.lottery.result-sync-backlog-batch-size}")
    private int backlogBatchSize;

    @Value("${daiphat.lottery.draw-deadline-minutes}")
    private long drawDeadlineMinutes;

    @Value("${daiphat.lottery.result-live-poll-seconds}")
    private long livePollSeconds;

    private final AtomicBoolean livePollingRunning = new AtomicBoolean(false);
    private volatile ScheduledFuture<?> livePollingFuture;

    public LotteryResultSyncScheduler(
            LotteryStationServicePort lotteryStationServicePort,
            LotteryResultServicePort lotteryResultServicePort,
            @Qualifier("lotteryResultLivePollingTaskScheduler")
            ThreadPoolTaskScheduler livePollingTaskScheduler
    ) {
        this.lotteryStationServicePort = lotteryStationServicePort;
        this.lotteryResultServicePort = lotteryResultServicePort;
        this.livePollingTaskScheduler = livePollingTaskScheduler;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapLivePolling() {
        refreshLivePollingTask();
    }

    @Scheduled(cron = "${daiphat.lottery.result-live-window-check-cron}")
    public void refreshLivePollingTask() {
        if (hasAnyActiveLiveWindow(LocalDateTime.now())) {
            startLivePollingIfNeeded();
            return;
        }
        stopLivePollingIfRunning();
    }

    @Scheduled(cron = "${daiphat.lottery.result-backlog-sync-cron}")
    public void syncHistoricalBacklog() {
        try {
            int backlogSynced = lotteryResultServicePort.syncHistoricalBacklog(backlogBatchSize);

            if (backlogSynced > 0) {
                log.info("Lottery result backlog scheduler synced backlogResults={}", backlogSynced);
            }
        } catch (Exception e) {
            String detail = (e instanceof com.daiphat.coreapi.domain.exception.DomainException de && de.getInternalMessage() != null)
                    ? de.getInternalMessage()
                    : e.getMessage();
            log.warn("Lottery result backlog scheduler encounter error: {}", detail);
        }
    }

    private void startLivePollingIfNeeded() {
        if (livePollingRunning.compareAndSet(false, true)) {
            livePollingFuture = livePollingTaskScheduler.scheduleAtFixedRate(
                    this::runLivePollingCycle,
                    java.time.Duration.ofSeconds(Math.max(livePollSeconds, 1))
            );
            log.info("Lottery result live polling started with interval={}s", livePollSeconds);
        }
    }

    private void stopLivePollingIfRunning() {
        if (!livePollingRunning.compareAndSet(true, false)) {
            return;
        }

        ScheduledFuture<?> future = livePollingFuture;
        if (future != null) {
            future.cancel(false);
            livePollingFuture = null;
        }
        log.info("Lottery result live polling stopped because no station is in live window");
    }

    private void runLivePollingCycle() {
        int liveSynced = syncTodayDrawingStations();
        if (liveSynced > 0) {
            log.info("Lottery result live polling synced liveResults={}", liveSynced);
        }

        if (!hasAnyActiveLiveWindow(LocalDateTime.now())) {
            stopLivePollingIfRunning();
        }
    }

    private int syncTodayDrawingStations() {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        List<LotteryStationModel> stations = lotteryStationServicePort.getScheduleModelsByDrawDate(today);
        int syncedCount = 0;

        for (LotteryStationModel station : stations) {
            if (!isWithinLiveWindow(station, today, now)) {
                continue;
            }

            try {
                LotteryResultModel result = lotteryResultServicePort.ensureResultForBoard(station.getId(), today);
                if (result.getStatus() == LotteryResultStatus.COMPLETED) {
                    continue;
                }
                lotteryResultServicePort.syncResult(result.getId(), LotteryStationSourceType.DEFAULT);
                syncedCount++;
            } catch (Exception e) {
                String detail = (e instanceof com.daiphat.coreapi.domain.exception.DomainException de && de.getInternalMessage() != null)
                        ? de.getInternalMessage()
                        : e.getMessage();
                log.warn("Không thể đồng bộ kết quả xổ số cho đài stationId={}, stationName={}: {}",
                        station.getId(), station.getName(), detail);
            }
        }
        return syncedCount;
    }

    private boolean hasAnyActiveLiveWindow(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        return lotteryStationServicePort.getScheduleModelsByDrawDate(today).stream()
                .anyMatch(station -> isWithinLiveWindow(station, today, now));
    }

    private boolean isWithinLiveWindow(
            LotteryStationModel station,
            LocalDate drawDate,
            LocalDateTime now
    ) {
        LocalTime drawTime = station.getDrawTime();
        if (drawTime == null) {
            return false;
        }

        LocalDateTime drawAt = LocalDateTime.of(drawDate, drawTime);
        LocalDateTime deadline = drawAt.plusMinutes(drawDeadlineMinutes);
        return !now.isBefore(drawAt) && !now.isAfter(deadline);
    }
}
