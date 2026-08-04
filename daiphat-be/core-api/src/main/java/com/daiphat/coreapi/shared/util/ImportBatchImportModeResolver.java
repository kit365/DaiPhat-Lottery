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
        LocalDate tomorrow = today.plusDays(1);

        if (drawDate.isBefore(today) || drawDate.isAfter(tomorrow)) {
            throw new IllegalArgumentException("drawDate must be today or tomorrow");
        }

        return ImportBatchImportMode.IN_DAY;
    }
}
