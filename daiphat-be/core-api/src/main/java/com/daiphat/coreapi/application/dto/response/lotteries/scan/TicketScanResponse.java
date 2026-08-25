package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.util.List;

/**
 * Response of POST /lottery-tickets/scan -- ticket-vision's raw detection
 * results enriched with Java's Layer-2 business validation per ticket.
 */
@Builder
public record TicketScanResponse(
        String scanId,
        int ticketCount,
        List<ScannedTicketResponse> tickets,
        List<String> warnings,
        Integer imageWidth,
        Integer imageHeight
) {
}
