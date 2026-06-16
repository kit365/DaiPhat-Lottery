package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record OrderPaidForProcessingEvent(
        UUID orderId,
        String orderCode
) {
}
