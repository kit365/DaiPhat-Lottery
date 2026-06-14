package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
@Builder
public record LotteryStationResponse(
        Long id,
        String name,
        String province,
        String region,
        String type,
        Integer numberLength,
        Integer minNumber,
        Integer maxNumber,
        BigDecimal price,
        Integer inventoryCount,
        String drawSchedule,
        String drawTime,
        LocalDate nextDrawDate,
        String status,
        UUID approvedById,
        LocalDateTime approvedAt,
        String image,
        String thumbnailUrl,
        String description,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
