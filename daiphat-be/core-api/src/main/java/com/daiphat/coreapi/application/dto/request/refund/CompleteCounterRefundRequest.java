package com.daiphat.coreapi.application.dto.request.refund;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundCounterPayoutMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CompleteCounterRefundRequest(
        @NotNull(message = "Vui lòng chọn hình thức hoàn tiền.") RefundCounterPayoutMethod paymentMethod,
        @NotNull(message = "Vui lòng nhập số tiền hoàn.") @Positive BigDecimal amount,
        /* Required when paymentMethod = TRANSFER. */
        @Size(max = 500) String transferEvidenceUrl,
        Boolean identityConfirmed,
        /* TRANSFER only: customer account that received the payout; defaults to the refund's current account. */
        @Positive Long bankAccountId
) {
}
