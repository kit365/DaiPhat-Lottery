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

    // ------------------------------------------------- file import only

    /**
     * File import accepts today's draw date and nothing else - narrower than
     * manual entry, which may also be used for tomorrow.
     *
     * <p>The two differ because a file is evidence of a delivery that has already
     * happened. Tickets for tomorrow's draw have not been handed over yet, so a
     * file claiming them would create a batch the warehouse cannot reconcile
     * against anything, and yesterday's are past the point where they could still
     * be sold. Manual entry stays wider on purpose: an operator declaring
     * tomorrow's expected quantities by hand is a legitimate, deliberate act.
     *
     * <p>A supplier file routinely covers a whole week; the other dates are
     * reported as out of window and the same file is re-uploaded each day.
     */
    public LocalDate fileImportFrom(LocalDateTime now) {
        return now.toLocalDate();
    }

    public LocalDate fileImportTo(LocalDateTime now) {
        return now.toLocalDate();
    }

    public boolean containsForFileImport(LocalDate drawDate, LocalDateTime now) {
        return drawDate != null && drawDate.equals(now.toLocalDate());
    }
}
