package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * When a supplier accepts new tickets for a draw date - both ends of the window.
 *
 * <p>Staff start pulling unsold tickets off the shelf {@code RETURN_BUFFER_TIME}
 * minutes before the supplier's {@code returnCutOffTime}, so that the return batch
 * is packed and handed over on time. Once that sweep begins, letting more tickets
 * in would mean counting stock that is already being boxed, so intake closes then
 * rather than at the cut-off itself.
 *
 * <p>The sweep always starts before the draw, which is why there is no separate
 * check against {@code lottery_stations.draw_time}: this window closes first.
 *
 * <p>Single source of truth for both intake paths — the manual declaration flow
 * (ImportBatchService) and the file upload preview (ImportBatchFileImportService)
 * — so the two can never drift apart.
 */
@Component
@RequiredArgsConstructor
public class SupplierTicketIntakeWindowPolicy {

    private final ImportBatchConfigResolver importBatchConfigResolver;

    /**
     * Clock time the ticket sweep begins, or {@code null} when the supplier has no
     * cut-off configured and therefore never closes.
     * When return buffer is {@code 0}, intake stays open until the cut-off itself.
     */
    public LocalTime inspectionStartTime(LotterySupplierModel supplier) {
        if (supplier == null || supplier.getReturnCutOffTime() == null) {
            return null;
        }
        int bufferMinutes = importBatchConfigResolver.resolveReturnBufferMinutes();
        return supplier.getReturnCutOffTime().minusMinutes(bufferMinutes);
    }

    /**
     * Whether the supplier's counter has not opened yet.
     *
     * <p>Read against the clock right now, deliberately not against the draw
     * date. {@code importAllowFrom} is the hour this supplier opens for business
     * today; until it arrives nothing can be collected from them, whichever draw
     * the tickets are for. Once it passes, tickets for a later draw may be taken
     * in straight away — there is nothing to wait for.
     *
     * <p>The closing rule is the mirror image: it belongs to the draw date, so a
     * batch for tomorrow stays open until tomorrow's sweep begins.
     *
     * @param drawDate accepted for symmetry with {@link #isIntakeClosed} and for
     *                 the message; the decision does not depend on it
     */
    public boolean isBeforeIntakeOpen(LotterySupplierModel supplier, LocalDate drawDate, LocalDateTime now) {
        if (supplier == null || supplier.getImportAllowFrom() == null) {
            return false;
        }
        return now.toLocalTime().isBefore(supplier.getImportAllowFrom());
    }

    /** Operator-facing reason, shared so both flows word the block identically. */
    public String notOpenMessage(LotterySupplierModel supplier, LocalDate drawDate) {
        return String.format(
                "Chưa đến giờ nhận vé của nhà cung cấp %s (từ %s hôm nay). "
                        + "Chưa thể nhập vé, kể cả cho kỳ quay %s.",
                supplier == null ? "-" : supplier.getName(),
                supplier == null || supplier.getImportAllowFrom() == null
                        ? "-" : supplier.getImportAllowFrom(),
                drawDate == null ? "-" : drawDate
        );
    }

    /**
     * Whether new tickets may no longer be taken in for {@code drawDate}.
     *
     * <p>Only same-day draws can close: a draw date in the future is always open,
     * and past draw dates are rejected earlier by the draw-date window rules.
     */
    public boolean isIntakeClosed(LotterySupplierModel supplier, LocalDate drawDate, LocalDateTime now) {
        LocalTime start = inspectionStartTime(supplier);
        if (start == null || drawDate == null || !drawDate.equals(now.toLocalDate())) {
            return false;
        }
        return !now.toLocalTime().isBefore(start);
    }

    /**
     * Whether a ticket of {@code drawDate} may still have its status changed -
     * cancelled, marked damaged, marked lost.
     *
     * <p>Wider than {@link #isIntakeClosed} by one case: a draw date already past
     * is locked outright. Once the sweep for a date has begun the unsold stock is
     * being counted and boxed for return, and once it is over that count has been
     * handed to the supplier. Voiding a ticket afterwards silently contradicts a
     * figure both sides have already signed for, so the shelf is frozen from the
     * moment the sweep starts and stays frozen.
     *
     * <p>A future draw date is untouched: its tickets are still on the shelf.
     */
    public boolean isTicketChangeLocked(
            LotterySupplierModel supplier,
            LocalDate drawDate,
            LocalDateTime now
    ) {
        if (drawDate == null) {
            return false;
        }
        LocalDate today = now.toLocalDate();
        if (drawDate.isBefore(today)) {
            return true;
        }
        if (!drawDate.equals(today)) {
            return false;
        }
        return isIntakeClosed(supplier, drawDate, now);
    }

    /** Short operator-facing reason for a frozen shelf. */
    public String ticketChangeLockedMessage(
            LotterySupplierModel supplier,
            LocalDate drawDate,
            LocalDateTime now
    ) {
        if (drawDate != null && now != null && drawDate.isBefore(now.toLocalDate())) {
            return String.format(
                    "Kỳ quay %s đã kết thúc và vé đã chốt trả cho nhà cung cấp. "
                            + "Không thể hủy vé của ngày quay đã qua.",
                    drawDate);
        }
        LocalTime start = inspectionStartTime(supplier);
        return String.format(
                "Đã đến giờ kiểm vé để chuẩn bị trả (%s) của nhà cung cấp %s. "
                        + "Không thể hủy vé cho kỳ quay %s nữa.",
                start == null ? "-" : start,
                supplier == null ? "-" : supplier.getName(),
                drawDate == null ? "-" : drawDate);
    }

    /** Operator-facing reason, shared so both flows word the block identically. */
    public String closedMessage(LotterySupplierModel supplier, LocalDate drawDate) {
        LocalTime start = inspectionStartTime(supplier);
        return String.format(
                "Đã đến giờ kiểm vé để chuẩn bị trả (%s) của nhà cung cấp %s. "
                        + "Không thể nhập thêm vé cho kỳ quay %s.",
                start == null ? "-" : start,
                supplier == null ? "-" : supplier.getName(),
                drawDate == null ? "-" : drawDate
        );
    }
}
