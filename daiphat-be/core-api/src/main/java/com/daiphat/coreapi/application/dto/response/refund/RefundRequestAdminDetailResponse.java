package com.daiphat.coreapi.application.dto.response.refund;

import com.daiphat.coreapi.application.dto.response.refund.RefundEligibleTicketItemResponse;
import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundCounterPayoutMethod;

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
        List<RefundEligibleTicketItemResponse> refundTickets,
        /* Staff-only: customer CCCD captured at the counter; null until staff starts counter resolution. */
        RefundCounterIdentitySummary counterIdentity
) {

    public record RefundCounterIdentitySummary(
            String cccdFrontImageUrl,
            String cccdBackImageUrl,
            EkycStatus ekycStatus,
            String ekycFailureReason,
            String ocrName,
            String ocrIdNumber,
            String ocrDob,
            String ocrGender,
            String ocrNationality,
            String ocrPlaceOfBirth,
            String ocrPlaceOfResidence,
            String ocrIssueDate,
            String ocrExpiryDate,
            LocalDateTime verifiedAt,
            RefundCounterPayoutMethod counterPayoutMethod
    ) {
    }

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
