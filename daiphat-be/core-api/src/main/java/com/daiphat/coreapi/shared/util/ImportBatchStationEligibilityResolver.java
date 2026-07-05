package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
public class ImportBatchStationEligibilityResolver {

    private final ImportBatchConfigResolver importBatchConfigResolver;

    public boolean isScheduledOnDrawDate(LotteryStationModel station, LocalDate drawDate) {
        if (station == null || drawDate == null) {
            return false;
        }
        if (station.getDrawDays() == null || station.getDrawDays().isEmpty()) {
            return false;
        }
        return station.getDrawDays().contains(drawDate.getDayOfWeek());
    }

    public boolean isEligibleForSelection(
            LotteryStationModel station,
            LocalDate drawDate,
            LocalDateTime now,
            ImportBatchImportMode importMode
    ) {
        if (drawDate == null || importMode == null || !isScheduledOnDrawDate(station, drawDate)) {
            return false;
        }

        LocalDate today = now.toLocalDate();
        if (!drawDate.equals(today)) {
            // Past/future draw dates: all scheduled stations are selectable.
            // Type resolver assigns ADDITIONAL when the draw has already completed.
            return true;
        }

        if (station.getDrawTime() == null) {
            return false;
        }

        boolean pastDraw = hasCompletedDrawToday(station, drawDate, now);

        if (isAfterSameDayCutoff(now.toLocalTime())) {
            return importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT && pastDraw;
        }

        // POST_DRAW_SUPPLEMENT: only stations that already drew.
        // IN_DAY: all stations scheduled today (before draw → NEW/SUPPLEMENT; after → ADDITIONAL).
        if (importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT) {
            return pastDraw;
        }
        return true;
    }

    public boolean hasCompletedDrawToday(LotteryStationModel station, LocalDate drawDate, LocalDateTime now) {
        if (station == null || drawDate == null) {
            return false;
        }
        LocalDate today = now.toLocalDate();
        if (drawDate.isBefore(today)) {
            return true;
        }
        if (drawDate.isAfter(today)) {
            return false;
        }
        if (station.getDrawTime() == null) {
            return false;
        }
        return now.toLocalTime().isAfter(station.getDrawTime());
    }

    public void validateStationEligibleOrThrow(
            LotteryStationModel station,
            LocalDate drawDate,
            LocalDateTime now,
            ImportBatchImportMode importMode
    ) {
        if (!isScheduledOnDrawDate(station, drawDate)) {
            throw new com.daiphat.coreapi.domain.exception.DomainException(
                    com.daiphat.coreapi.domain.exception.ErrorCode.IMPORT_BATCH_DRAW_DATE_INVALID,
                    "Ngày quay " + drawDate + " không khớp lịch quay của đài " + station.getName() + "."
            );
        }
        if (!isEligibleForSelection(station, drawDate, now, importMode)) {
            throw new com.daiphat.coreapi.domain.exception.DomainException(
                    com.daiphat.coreapi.domain.exception.ErrorCode.IMPORT_BATCH_DRAW_DATE_INVALID,
                    "Đài " + station.getName() + " không khả dụng cho ngày quay và loại nhập đã chọn."
            );
        }
    }

    private boolean isAfterSameDayCutoff(LocalTime currentTime) {
        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        return currentTime.isAfter(cutoff);
    }
}
