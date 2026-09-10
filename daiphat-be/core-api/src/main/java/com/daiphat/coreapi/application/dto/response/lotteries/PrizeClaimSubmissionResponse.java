package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
        BigDecimal totalTaxAmount,
        BigDecimal totalCommissionAmount,
        BigDecimal actualReceivedAmount,
        String actualReceivedEvidenceUrl,
        PrizeClaimSubmissionStatus status,
        ReturnDeliveryMode deliveryMode,
        String handoverEvidenceUrl,
        String handoverReceiptUrl,
        String supplierReference,
        String handoverNote,
        LocalDateTime handedOverAt,
        UUID handedOverBy,
        LocalDateTime submittedAt,
        UUID submittedBy,
        LocalDateTime cancelledAt,
        UUID cancelledBy,
        String cancelReason,
        boolean needsOutcome,
        int pendingOutcomeCount,
        LocalDateTime createdAt
) {
}
