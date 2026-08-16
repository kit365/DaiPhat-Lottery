package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import lombok.Builder;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Builder
public record OrderResponse(
        UUID id,
        UUID userId,
        String name,
        String phone,
        String email,
        String orderCode,
        OrderType orderType,
        OrderReceiveType receiveType,
        BigDecimal totalAmount,
        OrderStatus status,
        LocalDateTime expectedPickupAt,
        LocalDateTime cancelledAt,
        String cancelReason,
        OrderCancelType cancelType,
        LocalDateTime actualPickedUpAt,
        UUID pickedUpBy,
        List<OrderDetailResponse> orderDetails,
        List<TransactionResponse> transactions,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Boolean refundEligible,
        Long refundRemainingSeconds,
        Integer refundGraceMinutes,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
        OffsetDateTime refundPaymentSuccessAt,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
        OffsetDateTime refundDeadlineAt,
        com.daiphat.coreapi.application.dto.response.support.OrderComplaintEligibilityResponse complaintEligibility
) {
}
