package com.daiphat.coreapi.application.dto.lotteries;

import java.math.BigDecimal;
import java.util.List;

/**
 * Everything printed on a "phiếu nộp vé trúng thưởng" document, already resolved
 * to display text.
 *
 * <p>Assembled by {@link com.daiphat.coreapi.application.service.lotteries.PrizeClaimSubmissionService},
 * rendered by {@link com.daiphat.coreapi.shared.util.PrizeClaimSubmissionDocumentWriter}.
 */
public record PrizeClaimSubmissionDocument(
        Header header,
        Party submitter,
        Party recipient,
        Operator submittedBy,
        Operator handedOverBy,
        Totals totals,
        List<TicketLine> tickets,
        List<StationSummary> stationSummaries
) {

    public record Header(
            String submissionCode,
            String periodLabel,
            String status,
            String deliveryMode,
            String supplierReference,
            String handoverNote,
            String submittedAt,
            String handedOverAt,
            String createdAt
    ) {
    }

    public record Party(
            String name,
            String code,
            String taxCode,
            String contactName,
            String phone,
            String email,
            String address
    ) {
    }

    public record Operator(
            String fullName,
            String role,
            String phone,
            String email
    ) {
    }

    public record Totals(
            int ticketCount,
            BigDecimal grossPrizeAmount,
            BigDecimal taxAmount,
            BigDecimal commissionAmount,
            BigDecimal netClaimAmount,
            int stationCount
    ) {
    }

    public record TicketLine(
            String stationCode,
            String stationName,
            String drawDate,
            String numbers,
            String serialNumber,
            String prizeDisplayName,
            BigDecimal grossPrizeAmount,
            BigDecimal taxAmount,
            BigDecimal commissionAmount,
            BigDecimal netClaimAmount
    ) {
    }

    public record StationSummary(
            String stationCode,
            String stationName,
            int ticketCount,
            BigDecimal grossPrizeAmount,
            BigDecimal taxAmount,
            BigDecimal commissionAmount,
            BigDecimal netClaimAmount
    ) {
    }
}
