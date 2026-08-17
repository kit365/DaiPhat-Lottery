package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * When a supplier stops accepting new tickets for a draw date.
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
     */
    public LocalTime inspectionStartTime(LotterySupplierModel supplier) {
        if (supplier == null || supplier.getReturnCutOffTime() == null) {
            return null;
        }
        int bufferMinutes = importBatchConfigResolver.resolveReturnBufferMinutes();
        return supplier.getReturnCutOffTime().minusMinutes(bufferMinutes);
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
