package com.daiphat.coreapi.application.dto.request.payout;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CompletePrizePayoutRequest(
        @NotNull PrizePayoutPaymentMethod paymentMethod,
        java.math.BigDecimal cashAmount,
        @Size(max = 500) String transferEvidenceUrl
) {
}
