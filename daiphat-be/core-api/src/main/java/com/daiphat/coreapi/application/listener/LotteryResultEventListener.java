package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.LotteryResultSyncRequestedEvent;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryResultEventListener {

    private final LotteryResultServicePort lotteryResultServicePort;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleLotteryResultSyncRequested(LotteryResultSyncRequestedEvent event) {
        log.info("Handling LotteryResultSyncRequestedEvent for resultId={} source={}",
                event.resultId(), event.sourceType());
        lotteryResultServicePort.syncResult(event.resultId(), event.sourceType());
    }
}
