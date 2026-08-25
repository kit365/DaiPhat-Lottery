package com.daiphat.coreapi.infrastructure.dto.response.vision;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Raw wire shape of ticket-vision's ScanResponse
 * (services/ticket-vision/dto/response/scan_response.py:ScanResponse).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RemoteTicketScanResult(
        String scanId,
        int ticketCount,
        List<RemoteScannedTicket> tickets,
        List<String> warnings,
        Integer imageWidth,
        Integer imageHeight
) {
}
