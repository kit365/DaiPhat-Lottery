package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.service.lotteries.ReturnBatchAutoCancelService;
import com.daiphat.coreapi.application.port.in.lotteries.ReturnBatchServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchRepository;
import com.daiphat.coreapi.shared.util.ReturnBatchCutoffTiming;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/** Apply the same return-cutoff transition used by the scheduled workflow. */
@Component
@Order(117)
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class OfficialDemoReturnCutoffSeedInitializer implements ApplicationRunner {

    private final ReturnBatchAutoCancelService returnBatchAutoCancelService;
    private final ReturnBatchServicePort returnBatchServicePort;
    private final ReturnBatchRepository returnBatchRepository;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int cancelled = returnBatchAutoCancelService.cancelExpiredOpenBatches();
        log.info("Applied actual return cutoff workflow to {} expired return batches.", cancelled);
        LocalDateTime now = LocalDateTime.now(clock);
        int bufferMinutes = importBatchConfigResolver.resolveReturnBufferMinutes();
        returnBatchRepository.findByNoteStartingWithAndDeletedAtIsNull("SEED-RETURN-OFFICIAL-")
                .stream()
                .filter(batch -> now.toLocalDate().equals(batch.getDrawDate()))
                .filter(batch -> batch.getStatus() == ReturnBatchStatus.PENDING_INSPECTION)
                .filter(batch -> ReturnBatchCutoffTiming.isInInspectionWindow(
                        batch.getDrawDate(), batch.getLotterySupplier().getReturnCutOffTime(), now,
                        bufferMinutes))
                .forEach(batch -> returnBatchServicePort.startInspection(batch.getId()));
    }
}
