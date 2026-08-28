package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record CreateOcrTicketTemplateRequest(
        @NotNull(message = "Nhà đài không được để trống")
        Long stationId,

        @NotBlank(message = "Tên mẫu vé OCR không được để trống")
        String templateName,

        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        String sampleImageUrl,
        Boolean isActive,
        Boolean isDefault
) {}
