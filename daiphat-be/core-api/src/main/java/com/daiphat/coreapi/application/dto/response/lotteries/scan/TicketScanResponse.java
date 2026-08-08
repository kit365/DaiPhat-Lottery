package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.util.List;

/**
 * Response of POST /lottery-tickets/scan -- ticket-vision's raw detection
 * results (see infrastructure/dto/response/vision/RemoteTicketScanResult)
 * enriched with Java's Layer-2 business validation per ticket. Nothing is
 * persisted by this call; the mobile app confirms/edits, then calls
 * POST /lottery-tickets/batch-import.
 */
@Builder
public record TicketScanResponse(
        String scanId,
        int ticketCount,
        List<ScannedTicketResponse> tickets,
        List<String> warnings
) {
}
