package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record PrizeClaimSubmissionLineResponse(
        Long id,
        Long submissionId,
        Long serialId,
        String serialNumber,
        String ticketNumbers,
        Long stationId,
        String stationName,
        LocalDate drawDate,
        String prizeCode,
        String prizeDisplayName,
        BigDecimal grossPrizeAmount,
        BigDecimal netClaimAmount,
        BigDecimal taxAmount,
        BigDecimal commissionAmount,
        PrizeClaimSubmissionLineStatus lineStatus,
        PrizeClaimRejectionReason rejectionReason,
        String rejectionNote,
        String outcomeEvidenceUrl,
        long retryCount
) {
}
