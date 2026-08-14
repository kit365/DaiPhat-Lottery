package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Read model for the historical street-agent report; it is not a realtime dashboard. */
public final class StreetAgentReportResponse {
    private StreetAgentReportResponse() {
    }

    public record Period(LocalDate from, LocalDate to, List<String> statuses) {
    }

    public record Summary(
            int allocatedQuantity,
            int soldQuantity,
            int returnedQuantity,
            BigDecimal grossSales,
            BigDecimal commissionPayable,
            BigDecimal agentCashRemitted,
            BigDecimal sellThroughRate
    ) {
    }

    public record Overview(
            Period period,
            long reportCount,
            long openReportCount,
            long finalizedReportCount,
            long unsettledBatchCount,
            boolean provisional,
            Summary summary
    ) {
    }

    public record Agent(
            Long agentId,
            String agentName,
            long reportCount,
            int allocatedQuantity,
            int soldQuantity,
            int returnedQuantity,
            BigDecimal grossSales,
            BigDecimal commissionPayable,
            BigDecimal agentCashRemitted,
            BigDecimal sellThroughRate
    ) {
    }

    public record Station(
            Long stationId,
            String stationName,
            int allocatedQuantity,
            int soldQuantity,
            int returnedQuantity,
            BigDecimal grossSales,
            BigDecimal sellThroughRate
    ) {
    }
}
