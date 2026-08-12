package com.daiphat.coreapi.application.dto.response.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VendorConfidenceResponse(
        BigDecimal score,
        VendorConfidenceTier tier,
        BigDecimal capPercentage,
        int sampleSize,
        BigDecimal onTimeRate,
        BigDecimal sellThroughRate,
        BigDecimal experienceRate,
        LocalDateTime calculatedAt
) {
}
