package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
public record RegionPrizeStructureResponse(
        Long id,
        String region,
        boolean isOnly,
        String prizeLevel,
        String prizeDisplayName,
        String prizeCode,
        BigDecimal prizeValue,
        Integer quantity,
        Integer matchDigits,
        String matchFrom,
        String matchFromDisplayName,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
