package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * A serial as it exists inside an allocation batch.  This deliberately carries
 * allocation state, unlike a candidate used only while creating a draft.
 */
public record VendorAllocationSerialResponse(
        Long serialId,
        Long stationId,
        String stationName,
        String ticketNumbers,
        String serialNumber,
        LocalDate drawDate,
        BigDecimal faceValue,
        boolean lucky,
        List<String> luckyBadges,
        String allocationStatus,
        String ticketStatus,
        LocalDateTime returnedAt
) {
}
