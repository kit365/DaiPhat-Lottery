package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * One detected ticket from a /lottery-tickets/scan call -- the enriched,
 * client-facing shape, built explicitly field-by-field in
 * TicketScanImportService (never Jackson-deserialized directly; see
 * infrastructure/dto/response/vision/RemoteScannedTicket for the raw
 * ticket-vision wire shape this is built from).
 *
 * <p>{@code status}, {@code confidence}, {@code extracted}, {@code fieldConfidences},
 * {@code missingFields} and {@code validationErrors} come from ticket-vision's Layer-1
 * format validation. {@code businessValidationErrors}, {@code duplicate},
 * {@code resolvedStationId}, {@code resolvedDrawDate}, {@code fieldValidations},
 * {@code overallValidationStatus} and {@code adjustedConfidence} are added by
 * Java Layer-2 business validation.
 */
@Builder
public record ScannedTicketResponse(
        int ticketIndex,
        TicketBoundingBoxResponse bbox,
        ScannedTicketStatus status,
        double confidence,
        Double adjustedConfidence,
        ExtractedTicketFieldsResponse extracted,
        Map<String, Double> fieldConfidences,
        Map<String, TicketBoundingBoxResponse> fieldBoxes,
        Map<String, FieldValidationResult> fieldValidations,
        Map<String, OcrFieldDetailResponse> fields,
        OcrOverallValidationStatus overallValidationStatus,
        List<String> missingFields,
        List<String> validationErrors,
        List<String> businessValidationErrors,
        boolean duplicate,
        Long resolvedStationId,
        LocalDate resolvedDrawDate,
        String croppedImageBase64,
        Long ocrScanResultId,
        String sourceImageName,
        Integer imageWidth,
        Integer imageHeight
) {
}
