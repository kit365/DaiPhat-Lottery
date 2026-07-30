package com.daiphat.coreapi.application.event;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.UUID;

@Builder
public record PrizePayoutStatusChangedEvent(
        Long requestId,
        String requestCode,
        UUID customerId,
        PrizePayoutRequestStatus status,
        BigDecimal grossAmount,
        String rejectReason,
        Long orderDetailId,
        Long serialId
) {
}
