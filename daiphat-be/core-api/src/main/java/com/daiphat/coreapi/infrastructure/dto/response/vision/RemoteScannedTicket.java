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
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RemoteScannedTicket(
        int ticketIndex,
        TicketBoundingBoxResponse bbox,
        ScannedTicketStatus status,
        double confidence,
        ExtractedTicketFieldsResponse extracted,
        Map<String, Double> fieldConfidences,
        Map<String, TicketBoundingBoxResponse> fieldBoxes,
        Map<String, Long> usedFieldLayouts,
        List<String> missingFields,
        List<String> validationErrors,
        String croppedImageBase64,
        Integer imageWidth,
        Integer imageHeight
) {
}
