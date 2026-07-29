package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
public class ImportBatchImportModeResolver {

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

        // Same-day draw: IN_DAY (availability gated by supplier.importAllowFrom elsewhere).
        return ImportBatchImportMode.IN_DAY;
    }
}
