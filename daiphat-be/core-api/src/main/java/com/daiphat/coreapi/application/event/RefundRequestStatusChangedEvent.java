package com.daiphat.coreapi.application.event;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import lombok.Builder;

import java.util.UUID;

@Builder
public record RefundRequestStatusChangedEvent(
        Long refundRequestId,
        UUID customerId,
        UUID orderId,
        String orderCode,
        RefundRequestStatus status,
        int retryCount,
        RefundType refundType
) {
}
