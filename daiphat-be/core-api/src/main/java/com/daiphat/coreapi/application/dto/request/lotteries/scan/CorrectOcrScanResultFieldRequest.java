package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record CorrectOcrScanResultFieldRequest(
        @NotNull(message = "Tên trường không được để trống")
        OcrTemplateFieldName fieldName,
        String correctedValue
) {}
