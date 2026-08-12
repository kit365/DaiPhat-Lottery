package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record VendorAllocationCandidateResponse(
        Long serialId,
        Long stationId,
        String stationName,
        String ticketNumbers,
        String serialNumber,
        LocalDate drawDate,
        BigDecimal faceValue,
        boolean lucky,
        List<String> luckyBadges,
        boolean vendorEligible,
        String blockedReason
) {
}
