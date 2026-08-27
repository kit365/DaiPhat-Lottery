package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
public record OcrTicketTemplateResponse(
        Long id,
        Long stationId,
        String templateName,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        String sampleImageUrl,
        boolean isActive,
        boolean isDefault,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
