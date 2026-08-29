package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Builder
public record PrizeClaimSubmissionResponse(
        Long id,
        String submissionCode,
        Long supplierId,
        String supplierName,
        LocalDate periodFrom,
        LocalDate periodTo,
        Integer totalTicketCount,
        BigDecimal totalGrossPrizeAmount,
        BigDecimal totalNetClaimAmount,
        BigDecimal totalCommissionAmount,
        PrizeClaimSubmissionStatus status,
        LocalDateTime submittedAt,
        UUID submittedBy,
        LocalDateTime confirmedAt,
        UUID confirmedBy,
        LocalDateTime completedAt,
        UUID completedBy,
        LocalDateTime cancelledAt,
        UUID cancelledBy,
        UUID approvedBy,
        String confirmationReference,
        String confirmationEvidenceUrl,
        LocalDate paymentDeadline,
        boolean isOverdue,
        BigDecimal paidAmount,
        PrizeClaimSubmissionSettlementStatus settlementStatus,
        BigDecimal settlementDifferenceAmount,
        String cancelReason,
        List<String> paymentEvidenceUrls,
        String paymentNote,
        LocalDateTime createdAt
) {
}
