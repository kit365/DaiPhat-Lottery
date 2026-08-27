package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldDataType;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record OcrFieldLayoutResponse(
        Long id,
        Long templateId,
        OcrTemplateFieldName fieldName,
        OcrNormalizedBoundingBox boundingBox,
        OcrFieldDataType dataType,
        boolean isRequired,
        int priority,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
