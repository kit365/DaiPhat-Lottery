package com.daiphat.coreapi.application.event;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionSettlementStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Event phát ra khi PrizeClaimSubmission chuyển sang COMPLETED.
 * Listener xử lý:
 * <ul>
 *   <li>Credit agency_funds với paidAmount
 *   <li>Cập nhật SupplierSettlement (total_paid_amount, settlement_status)
 *   <li>Tạo SupplierSettlementReceivable nếu UNDERPAID
 * </ul>
 */
@Builder
public record PrizeClaimSubmissionCompletedEvent(
        Long submissionId,
        String submissionCode,
        Long supplierId,
        BigDecimal paidAmount,
        BigDecimal totalNetClaimAmount,
        PrizeClaimSubmissionSettlementStatus settlementStatus,
        BigDecimal settlementDifferenceAmount,
        UUID agencyId,
        UUID completedBy
) {
}
