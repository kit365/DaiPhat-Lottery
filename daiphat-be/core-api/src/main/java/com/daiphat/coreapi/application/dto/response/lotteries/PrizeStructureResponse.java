package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
@Builder
public record PrizeStructureResponse(
        Long id,
        Long regionId,
        String regionCode,
        String prizeLevel,
        String prizeDisplayName,
        String prizeCode,
        String description,
        BigDecimal prizeValue,
        Integer quantity,
        Integer matchDigits,
        String matchFrom,
        String matchFromDisplayName,
        Integer displayOrder,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
