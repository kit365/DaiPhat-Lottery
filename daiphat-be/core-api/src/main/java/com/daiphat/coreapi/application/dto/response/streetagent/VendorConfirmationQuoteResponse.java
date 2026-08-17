package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record VendorConfirmationQuoteResponse(
        Long batchId,
        int allocatedQuantity,
        BigDecimal vendorUnitPrice,
        BigDecimal depositRate,
        BigDecimal depositRequiredAmount,
        LocalTime returnCutoff,
        String latePolicy,
        String quoteFingerprint,
        LocalDateTime quotedAt,
        LocalDateTime effectiveHandoverDeadlineAt
) {
}
