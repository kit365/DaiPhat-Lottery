package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.util.List;

public record VendorAllocationSuggestionResponse(
        int remainingDailyCap,
        int suggestedQuantity,
        int counterReservePerStation,
        String blockedReason,
        List<StationGroup> stations
) {
    public record StationGroup(
            Long stationId,
            String stationName,
            int availableCount,
            int suggestedCount,
            int selectableCount,
            List<TicketGroup> tickets
    ) {
    }

    public record TicketGroup(
            String ticketNumbers,
            BigDecimal faceValue,
            boolean lucky,
            List<String> luckyBadges,
            int availableCount,
            int suggestedCount,
            int selectableCount,
            boolean vendorEligible,
            String blockedReason,
            List<SerialItem> serials
    ) {
    }

    public record SerialItem(
            Long serialId,
            String serialNumber,
            boolean lucky,
            List<String> luckyBadges,
            boolean vendorEligible,
            String blockedReason,
            boolean suggested
    ) {
    }
}
