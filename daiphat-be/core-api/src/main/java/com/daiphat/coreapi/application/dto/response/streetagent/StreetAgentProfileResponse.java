package com.daiphat.coreapi.application.dto.response.streetagent;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
        BigDecimal depositBalance,
        String depositAdjustmentReason,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String createdBy,
        String lastModifiedBy
) {}
