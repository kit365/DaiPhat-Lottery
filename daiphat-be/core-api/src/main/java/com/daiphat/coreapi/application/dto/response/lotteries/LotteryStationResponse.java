package com.daiphat.coreapi.application.dto.response.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Builder
public record LotteryStationResponse(
        Long id,
        String name,
        String code,
        String province,
        String region,
        String type,
        BigDecimal price,
        BigDecimal commissionRate,
        Boolean isActive,
        List<String> missingActivationFields,
        Integer inventoryCount,
        List<DayOfWeek> drawDays,
        @JsonFormat(pattern = "HH:mm")
        LocalTime drawTime,
        LocalDate nextDrawDate,
        UUID approvedById,
        LocalDateTime approvedAt,
        String image,
        String thumbnailUrl,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
