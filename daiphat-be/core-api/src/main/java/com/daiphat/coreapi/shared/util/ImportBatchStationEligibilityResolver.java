package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
public class ImportBatchStationEligibilityResolver {

    public boolean isScheduledOnDrawDate(LotteryStationModel station, LocalDate drawDate) {
        if (station == null || drawDate == null) {
            return false;
        }
        DrawScheduleUtils.validate(station.getDrawDays(), station.getDrawTime());
        DayOfWeek drawDay = drawDate.getDayOfWeek();
        return station.getDrawDays().contains(drawDay);
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
            return true;
        }

        if (station.getDrawTime() == null) {
            return false;
        }

        boolean pastDraw = hasCompletedDrawToday(station, drawDate, now);
        if (importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT) {
            return pastDraw;
        }
        return !pastDraw;
    }

    public boolean hasCompletedDrawToday(LotteryStationModel station, LocalDate drawDate, LocalDateTime now) {
        if (station == null || drawDate == null || station.getDrawTime() == null) {
            return false;
        }
        LocalDate today = now.toLocalDate();
        if (!drawDate.equals(today)) {
            return drawDate.isBefore(today);
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
}
