package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.infrastructure.dto.jackson.LenientLocalDateDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

import java.time.LocalDate;

/**
 * Mirrors ticket-vision's ExtractedTicketFields. drawDate arrives from
 * Python as an ISO date string (or null); Jackson binds it to LocalDate
 * with a lenient fallback so bad OCR date strings never fail the whole scan.
 */
public record ExtractedTicketFieldsResponse(
        String stationName,
        String stationCode,
        String serialNumber,
        String numbers,
        @JsonDeserialize(using = LenientLocalDateDeserializer.class)
        LocalDate drawDate,
        String ticketType,
        String batchCode
) {
}
