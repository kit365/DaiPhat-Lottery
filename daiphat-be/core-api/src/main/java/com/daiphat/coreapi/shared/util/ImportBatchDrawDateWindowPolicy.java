package com.daiphat.coreapi.shared.util;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Which draw dates a new import batch may be created for: today or tomorrow.
 *
 * <p>Mirrors the rule enforced by ImportBatchService.validateDrawDateRange, but as
 * a predicate rather than an exception, so a bulk file upload can mark rows as
 * "not importable yet" instead of failing the whole upload. A supplier file
 * routinely covers a whole week and is re-uploaded each day to pick up the rows
 * that have come into range.
 *
 * <p>ImportBatchService remains the authority - this only decides what the preview
 * shows.
 */
@Component
public class ImportBatchDrawDateWindowPolicy {

    private static final int DAYS_AHEAD = 1;

    public LocalDate from(LocalDateTime now) {
        return now.toLocalDate();
    }

    public LocalDate to(LocalDateTime now) {
        return now.toLocalDate().plusDays(DAYS_AHEAD);
    }

    public boolean contains(LocalDate drawDate, LocalDateTime now) {
        if (drawDate == null) {
            return false;
        }
        return !drawDate.isBefore(from(now)) && !drawDate.isAfter(to(now));
    }
}
