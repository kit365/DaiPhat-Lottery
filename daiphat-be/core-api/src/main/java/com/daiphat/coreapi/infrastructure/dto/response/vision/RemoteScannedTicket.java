package com.daiphat.coreapi.infrastructure.dto.response.vision;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.ExtractedTicketFieldsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketBoundingBoxResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

/**
 * Raw wire shape of one entry in ticket-vision's ScanResponse.tickets[]
 * (services/ticket-vision/dto/response/scan_response.py:TicketScanResult).
 * Deserialized directly by Jackson -- every field here is always present
 * in Python's JSON (Pydantic serializes null fields explicitly rather than
 * omitting them), so this is safe as a direct record deserialization
 * target, unlike the enriched ScannedTicketResponse which adds Java-only
 * fields ticket-vision never sends.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RemoteScannedTicket(
        int ticketIndex,
        TicketBoundingBoxResponse bbox,
        ScannedTicketStatus status,
        double confidence,
        ExtractedTicketFieldsResponse extracted,
        Map<String, Double> fieldConfidences,
        List<String> missingFields,
        List<String> validationErrors,
        String croppedImageBase64
) {
}
