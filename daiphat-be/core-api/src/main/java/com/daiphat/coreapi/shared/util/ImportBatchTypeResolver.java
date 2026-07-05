package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ImportBatchTypeResolver {

    private static final DateTimeFormatter TIME_DISPLAY = DateTimeFormatter.ofPattern("H:mm");

    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ImportBatchStationEligibilityResolver stationEligibilityResolver;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final Clock clock;

    public ClassificationResult resolve(
            Long stationId,
            LocalDate drawDate,
            LotteryStationModel station,
            ImportBatchImportMode importMode
    ) {
        LocalDateTime now = LocalDateTime.now(clock);
        validateSameDayCutoffOrThrow(drawDate, station, importMode, now);

        // After official draw time for the selected draw date + station → ADDITIONAL (ADJUSTMENT).
        // Takes precedence over NEW / SUPPLEMENTARY (and LATE_IMPORT).
        if (importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT
                || stationEligibilityResolver.hasCompletedDrawToday(station, drawDate, now)) {
            return new ClassificationResult(ImportBatchType.ADJUSTMENT, false, List.of());
        }

        if (drawDate != null
                && drawDate.equals(now.toLocalDate())
                && isInLateImportWindow(now.toLocalTime())) {
            List<String> warnings = new ArrayList<>();
            warnings.add(buildLateImportWarning());
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

    public void validateSameDayCutoffOrThrow(
            LocalDate drawDate,
            LotteryStationModel station,
            ImportBatchImportMode importMode,
            LocalDateTime now
    ) {
        if (drawDate == null || !drawDate.equals(now.toLocalDate())) {
            return;
        }

        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        if (!now.toLocalTime().isAfter(cutoff)) {
            return;
        }

        if (importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT) {
            return;
        }

        throw new DomainException(ErrorCode.IMPORT_BATCH_CUTOFF_PASSED);
    }

    private boolean isInLateImportWindow(LocalTime currentTime) {
        LocalTime lateImportTime = importBatchConfigResolver.resolveLateImportTime();
        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        return !currentTime.isBefore(lateImportTime) && !currentTime.isAfter(cutoff);
    }

    private String buildLateImportWarning() {
        LocalTime lateImportTime = importBatchConfigResolver.resolveLateImportTime();
        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        return String.format(
                "Đang trong khung giờ nhập muộn (%s - %s). Loại lô được chuyển thành LATE_IMPORT.",
                lateImportTime.format(TIME_DISPLAY),
                cutoff.format(TIME_DISPLAY)
        );
    }

    public record ClassificationResult(
            ImportBatchType resolvedBatchType,
            boolean lateImportWarning,
            List<String> warnings
    ) {
    }
}
