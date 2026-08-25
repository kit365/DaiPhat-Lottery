package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Staging row from {@code ocr_scan_results} for Admin review before batch-import.
 */
@Builder
public record OcrScanResultResponse(
        Long id,
        String scanId,
        int ticketIndex,
        Long importBatchLineId,
        Long stationId,
        String sourceImageName,
        TicketBoundingBoxResponse bbox,
        Integer imageWidth,
        Integer imageHeight,
        String extractedStationName,
        String extractedSerialNumber,
        String extractedNumbers,
        LocalDate extractedDrawDate,
        String extractedBatchCode,
        String extractedPrice,
        double confidence,
        Double adjustedConfidence,
        Map<String, Double> fieldConfidences,
        Map<String, TicketBoundingBoxResponse> fieldBoxes,
        Map<String, FieldValidationResult> fieldValidations,
        OcrOverallValidationStatus overallValidationStatus,
        ScannedTicketStatus status,
        List<String> missingFields,
        List<String> validationErrors,
        List<String> businessValidationErrors,
        String croppedImageUrl,
        UUID scannedBy,
        LocalDateTime scannedAt
) {
}
