package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import jakarta.validation.constraints.NotNull;

public record ReportSerialFaultRequest(
        @NotNull(message = "Trạng thái báo hỏng không được để trống.")
        LotteryTicketSerialStatus status,

        @NotNull(message = "Nguồn gây lỗi không được để trống.")
        LotteryTicketSerialFaultedBy faultedBy,

        String damagedReason,
        String damagedEvidenceUrl
) {}
