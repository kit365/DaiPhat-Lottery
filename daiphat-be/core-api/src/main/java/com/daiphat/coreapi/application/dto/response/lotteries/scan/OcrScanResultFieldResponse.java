package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record OcrScanResultFieldResponse(
        Long id,
        Long ocrScanResultId,
        OcrTemplateFieldName fieldName,
        String aiValue,
        Double aiConfidence,
        TicketBoundingBoxResponse detectedBoundingBox,
        String correctedValue,
        boolean isCorrected,
        UUID correctedBy,
        LocalDateTime correctedAt,
        OcrFieldValidationStatus validationStatus,
        String validationMessage,
        String expectedValue,
        String effectiveValue,
        Long fieldLayoutId
) {}
