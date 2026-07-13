package com.daiphat.coreapi.application.dto.response.refund;

import com.daiphat.coreapi.application.dto.response.order.TransactionResponse;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record RefundRequestResponse(
        Long id,
        RefundType refundType,
        UUID orderId,
        List<Long> orderDetailIds,
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
        int retryCount,
        String operatorNote,
        Integer maxRefundBankInfoRetry,
        UUID reviewedBy,
        LocalDateTime reviewedAt,
        /** Refund payout transaction holding paymentEvidenceUrl / paymentBy / note / paidAt. */
        TransactionResponse payoutTransaction,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String orderCode,
        LocalDateTime processingDeadlineAt,
        Long remainingProcessingSeconds,
        RefundProcessingUrgency processingUrgency
) {
}
