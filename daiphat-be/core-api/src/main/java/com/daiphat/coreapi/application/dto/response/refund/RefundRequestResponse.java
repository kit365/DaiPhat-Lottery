package com.daiphat.coreapi.application.dto.response.refund;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record RefundRequestResponse(
        Long id,
        RefundType refundType,
        UUID orderId,
        Long orderDetailId,
        UUID requestedBy,
        RefundRequestRole requestRole,
        RefundRequestStatus status,
        BigDecimal refundAmount,
        String refundReason,
        Long bankAccountId,
        UserBankAccountResponse bankAccount,
        RefundFundSource fundSource,
        ReimburseStatus reimburseStatus,
        int attemptNumber,
        String rejectReason,
        UUID reviewedBy,
        LocalDateTime reviewedAt,
        String transferEvidenceUrl,
        LocalDateTime transferredAt,
        UUID transferredBy,
        String transferNote,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String orderCode,
        LocalDateTime processingDeadlineAt,
        Long remainingProcessingSeconds,
        RefundProcessingUrgency processingUrgency
) {
}
