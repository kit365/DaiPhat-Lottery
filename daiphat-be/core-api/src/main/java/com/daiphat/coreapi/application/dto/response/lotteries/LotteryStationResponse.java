package com.daiphat.coreapi.application.dto.response.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;
import java.util.List;
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
        List<DayOfWeek> drawDays,
        @JsonFormat(pattern = "HH:mm")
        LocalTime drawTime,
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
