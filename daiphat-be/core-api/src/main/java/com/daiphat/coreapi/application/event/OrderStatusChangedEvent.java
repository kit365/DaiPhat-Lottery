package com.daiphat.coreapi.application.event;

import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import lombok.Builder;

import java.util.UUID;

@Builder
public record OrderStatusChangedEvent(
        UUID orderId,
        UUID customerId,
        String orderCode,
        OrderStatus status
) {
}
