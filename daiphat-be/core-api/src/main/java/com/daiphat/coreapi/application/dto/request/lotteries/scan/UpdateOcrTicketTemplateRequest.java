package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import lombok.Builder;

import java.time.LocalDate;

@Builder
public record UpdateOcrTicketTemplateRequest(
        String templateName,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        String sampleImageUrl,
        Boolean isActive,
        Boolean isDefault
) {}
