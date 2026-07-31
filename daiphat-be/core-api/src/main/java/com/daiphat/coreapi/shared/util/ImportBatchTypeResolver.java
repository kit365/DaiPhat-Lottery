package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ImportBatchTypeResolver {

    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final Clock clock;

    public ClassificationResult resolve(
            Long stationId,
            LocalDate drawDate,
            LotteryStationModel station,
            ImportBatchImportMode importMode
    ) {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();

        if (drawDate == null) {
            return new ClassificationResult(ImportBatchType.ADJUSTMENT, false, List.of());
        }

        if (drawDate.isBefore(today)) {
            return new ClassificationResult(ImportBatchType.ADJUSTMENT, false, List.of());
        }

        if (importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT) {
            return new ClassificationResult(ImportBatchType.ADJUSTMENT, false, List.of());
        }

        if (drawDate.isAfter(today.plusDays(1))) {
            return new ClassificationResult(ImportBatchType.ADJUSTMENT, false, List.of());
        }

        if (importBatchLineRepositoryPort.existsNonDraftLineForStationAndDrawDate(stationId, drawDate)) {
            return new ClassificationResult(ImportBatchType.SUPPLEMENTARY, false, List.of());
        }

        return new ClassificationResult(ImportBatchType.NEW, false, List.of());
    }

    public record ClassificationResult(
            ImportBatchType resolvedBatchType,
            boolean lateImportWarning,
            List<String> warnings
    ) {
    }
}
