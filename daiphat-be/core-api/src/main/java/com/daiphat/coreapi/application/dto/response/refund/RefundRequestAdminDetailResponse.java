package com.daiphat.coreapi.application.dto.response.refund;

import com.daiphat.coreapi.application.dto.response.refund.RefundEligibleTicketItemResponse;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RefundRequestAdminDetailResponse(
        RefundRequestResponse refund,
        RefundOrderSummary orderSummary,
        RefundCustomerSummary customerSummary,
        String reviewerName,
        String transferrerName,
        List<RefundProcessingHistoryItem> processingHistory,
        List<RefundEligibleTicketItemResponse> refundTickets
) {

    public record RefundOrderSummary(
            UUID id,
            String orderCode,
            OrderStatus status,
            BigDecimal totalAmount,
            LocalDateTime createdAt,
            String cancelReason
    ) {
    }

    public record RefundCustomerSummary(
            UUID id,
            String fullName,
            String email,
            String phone
    ) {
    }
}
