package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import jakarta.validation.constraints.NotNull;

/**
 * Report a serial incident via {@code ticketCondition}:
 * {@code DAMAGED} / {@code LOST} (physical) or {@code VOIDED} (data-entry cancel).
 */
public record ReportSerialFaultRequest(
        @NotNull(message = "Tình trạng vé không được để trống.")
        TicketCondition ticketCondition,

        @NotNull(message = "Nguồn gây lỗi không được để trống.")
        LotteryTicketSerialFaultedBy faultedBy,

        String damagedReason,
        String damagedEvidenceUrl,

        /** Optional replacement serial number for data-entry (VOIDED) incidents. */
        String replacementSerialNumber,
        String replacementTicketImg
) {}
