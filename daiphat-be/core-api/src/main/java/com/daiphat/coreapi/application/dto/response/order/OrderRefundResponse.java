package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.order.refund.OrderRefundStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record OrderRefundResponse(
        Long id,
        OrderRefundStatus status,
        BigDecimal refundAmount,
        String refundReason,
        String bankBin,
        String bankName,
        String bankAccountNo,
        String bankAccountName,
        LocalDateTime refundAt,
        UUID refundApprovedBy
) {
}
