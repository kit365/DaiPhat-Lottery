package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import java.time.LocalDate;

/**
 * Mirrors ticket-vision's ExtractedTicketFields. drawDate arrives from
 * Python as an ISO date string (or null); Jackson binds it straight to
 * LocalDate.
 */
public record ExtractedTicketFieldsResponse(
        String stationName,
        String stationCode,
        String serialNumber,
        String numbers,
        LocalDate drawDate,
        // Ticket price/denomination (e.g. "10.000đ"). Optional supplementary
        // field -- never required, never affects scan status/validation.
        String ticketType
) {
}
