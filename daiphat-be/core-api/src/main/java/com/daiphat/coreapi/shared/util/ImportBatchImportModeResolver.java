package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
public class ImportBatchImportModeResolver {

    private final ImportBatchConfigResolver importBatchConfigResolver;

    public ImportBatchImportMode resolve(LocalDate drawDate, LocalDateTime now) {
        if (drawDate == null) {
            throw new IllegalArgumentException("drawDate is required");
        }

        LocalDate today = now.toLocalDate();

        if (drawDate.isBefore(today)) {
            return ImportBatchImportMode.POST_DRAW_SUPPLEMENT;
        }

        if (drawDate.equals(today.plusDays(1))) {
            return ImportBatchImportMode.IN_DAY;
        }

        if (drawDate.isAfter(today.plusDays(1))) {
            return ImportBatchImportMode.POST_DRAW_SUPPLEMENT;
        }

        if (isAfterSameDayCutoff(now.toLocalTime())) {
            return ImportBatchImportMode.POST_DRAW_SUPPLEMENT;
        }

        return ImportBatchImportMode.IN_DAY;
    }

    private boolean isAfterSameDayCutoff(LocalTime currentTime) {
        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        return currentTime.isAfter(cutoff);
    }
}
