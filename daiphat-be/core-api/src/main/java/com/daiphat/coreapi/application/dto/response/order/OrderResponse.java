package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Builder
public record OrderResponse(
        UUID id,
        UUID userId,
        String name,
        String phone,
        String orderCode,
        OrderType orderType,
        OrderReceiveType receiveType,
        BigDecimal totalAmount,
        OrderStatus status,
        LocalDateTime expectedPickupAt,
        LocalDateTime cancelledAt,
        String cancelReason,
        LocalDateTime actualPickedUpAt,
        UUID pickedUpBy,
        List<OrderDetailResponse> orderDetails,
        List<TransactionResponse> transactions,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
