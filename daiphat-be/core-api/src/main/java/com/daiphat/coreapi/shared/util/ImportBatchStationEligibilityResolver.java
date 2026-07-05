package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
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
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

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

        if (importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(station.getId(), drawDate)) {
            return false;
        }

        LocalDate today = now.toLocalDate();

        if (drawDate.isBefore(today)) {
            return importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT;
        }

        if (drawDate.equals(today.plusDays(1))) {
            return importMode == ImportBatchImportMode.IN_DAY;
        }

        if (drawDate.isAfter(today.plusDays(1))) {
            return false;
        }

        if (isAfterSameDayCutoff(now.toLocalTime())) {
            return importMode == ImportBatchImportMode.POST_DRAW_SUPPLEMENT;
        }

        return importMode == ImportBatchImportMode.IN_DAY;
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

        if (importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(station.getId(), drawDate)) {
            Long draftBatchId = importBatchLineRepositoryPort
                    .findDraftBatchIdForStationAndDrawDate(station.getId(), drawDate)
                    .orElse(null);
            String message = draftBatchId != null
                    ? String.format(
                    "Đài %s đã có phiếu nhập nháp #%d cho ngày quay %s. Vui lòng hoàn tất phiếu hiện tại.",
                    station.getName(),
                    draftBatchId,
                    drawDate
            )
                    : String.format(
                    "Đài %s đã có phiếu nhập nháp cho ngày quay %s. Vui lòng hoàn tất phiếu hiện tại.",
                    station.getName(),
                    drawDate
            );
            throw new com.daiphat.coreapi.domain.exception.DomainException(
                    com.daiphat.coreapi.domain.exception.ErrorCode.IMPORT_BATCH_STATION_DRAFT_EXISTS,
                    message
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
