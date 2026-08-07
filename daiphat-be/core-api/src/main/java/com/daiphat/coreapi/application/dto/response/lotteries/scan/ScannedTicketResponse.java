package com.daiphat.coreapi.application.dto.response.lotteries.scan;

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
 * {@code resolvedStationId} and {@code resolvedDrawDate} are added by
 * TicketScanImportService's Layer-2 business validation and are never populated
 * by the Python service directly.
 *
 * <p>{@code status} reflects the FINAL, post-Layer-2 assessment shown to the
 * mobile app for the bounding-box color: Java may downgrade a ticket to
 * INCOMPLETE (e.g. draw-date mismatch, duplicate serial) but never upgrades
 * what ticket-vision reported.
 */
@Builder
public record ScannedTicketResponse(
        int ticketIndex,
        TicketBoundingBoxResponse bbox,
        ScannedTicketStatus status,
        double confidence,
        ExtractedTicketFieldsResponse extracted,
        Map<String, Double> fieldConfidences,
        List<String> missingFields,
        List<String> validationErrors,
        List<String> businessValidationErrors,
        boolean duplicate,
        Long resolvedStationId,
        LocalDate resolvedDrawDate,
        String croppedImageBase64,
        /**
         * The persisted OCR_Scan_Result row id for this detection (Lottery_Scan_Log
         * audit trail, DP-269 follow-up). Send this back unchanged on
         * {@link com.daiphat.coreapi.application.dto.request.lotteries.scan.ConfirmedScannedTicketRequest}
         * when confirming — it's how batch-import tells a straight OCR
         * confirmation apart from a manually-corrected one.
         */
        Long ocrScanResultId
) {
}
