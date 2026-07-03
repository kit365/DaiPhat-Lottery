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
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ImportBatchTypeResolver {

    private static final String LATE_IMPORT_WARNING =
            "Đang trong khung giờ nhập muộn (14:30 - 15:00). Loại lô được chuyển thành LATE_IMPORT.";

    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final Clock clock;

    public ClassificationResult resolve(
            Long stationId,
            LocalDate drawDate,
            LotteryStationModel station,
            ImportBatchImportMode importMode
    ) {
        if (importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT) {
            return new ClassificationResult(ImportBatchType.ADJUSTMENT, false, List.of());
        }

        LocalDateTime now = LocalDateTime.now(clock);
        if (drawDate != null
                && drawDate.equals(now.toLocalDate())
                && isInLateImportWindow(now.toLocalTime())) {
            List<String> warnings = new ArrayList<>();
            warnings.add(LATE_IMPORT_WARNING);
            return new ClassificationResult(ImportBatchType.LATE_IMPORT, true, warnings);
        }

        if (importBatchLineRepositoryPort.existsByStationAndDrawDateAndBatchType(
                stationId,
                drawDate,
                ImportBatchType.NEW
        )) {
            return new ClassificationResult(ImportBatchType.SUPPLEMENTARY, false, List.of());
        }

        return new ClassificationResult(ImportBatchType.NEW, false, List.of());
    }

    private boolean isInLateImportWindow(LocalTime currentTime) {
        LocalTime lateWindowStart = importBatchConfigResolver.resolveLateWindowStart();
        LocalTime cutoff = importBatchConfigResolver.resolveImportCutoff();
        return !currentTime.isBefore(lateWindowStart) && !currentTime.isAfter(cutoff);
    }

    public record ClassificationResult(
            ImportBatchType resolvedBatchType,
            boolean lateImportWarning,
            List<String> warnings
    ) {
    }
}
