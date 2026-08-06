package com.daiphat.coreapi.application.dto.response.streetagent;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;

@Builder
public record StreetAgentProfileResponse(
        Long id,
        String firstName,
        String lastName,
        String phone,
        String cccd,
        String imageUrl,
        String contactAddress,
        String contactProvince,
        String coverageArea,
        BigDecimal commissionRate,
        LocalDate contractStartDate,
        LocalDate contractEndDate,
        String contractCode,
        String contractDocumentUrl,
        Integer dailyTicketCap,
        BigDecimal confidenceScore,
        VendorConfidenceTier confidenceTier,
        LocalDateTime confidenceCalculatedAt,
        BigDecimal depositBalance,
        String depositAdjustmentReason,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String createdBy,
        String lastModifiedBy
) {}
