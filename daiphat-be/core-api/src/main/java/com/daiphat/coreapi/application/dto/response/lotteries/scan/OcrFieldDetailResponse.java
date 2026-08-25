package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import lombok.Builder;

/**
 * One OCR field with recognition confidence, location, and optional system validation.
 * batchCode has confidence + bbox but typically no system MATCHED/MISMATCHED check.
 */
@Builder
public record OcrFieldDetailResponse(
        String fieldName,
        String value,
        Double confidence,
        TicketBoundingBoxResponse boundingBox,
        OcrFieldValidationStatus validationStatus,
        String validationMessage,
        String expectedValue
) {
}
