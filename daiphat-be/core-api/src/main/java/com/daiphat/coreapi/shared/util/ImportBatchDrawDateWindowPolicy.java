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
     * File import accepts the same draw dates as manual entry: today and
     * tomorrow.
     *
     * <p>A supplier hands tomorrow's tickets over during today's opening hours,
     * so a file listing them is evidence of a delivery that really has happened.
     * What stops such a batch is not the calendar but the supplier's own window:
     * intake opens at {@code importAllowFrom} today and closes for a given draw
     * date when that date's return sweep begins — see
     * {@link SupplierTicketIntakeWindowPolicy}.
     *
     * <p>Past draw dates stay out. Those tickets can no longer be sold, and a
     * shortfall found afterwards is settled through supplier reconciliation
     * rather than by importing them late.
     *
     * <p>Kept as its own method rather than folded into {@link #contains} so the
     * file flow's rule stays visible and can diverge again without silently
     * changing manual entry.
     */
    public LocalDate fileImportFrom(LocalDateTime now) {
        return from(now);
    }

    public LocalDate fileImportTo(LocalDateTime now) {
        return to(now);
    }

    public boolean containsForFileImport(LocalDate drawDate, LocalDateTime now) {
        return contains(drawDate, now);
    }
}
