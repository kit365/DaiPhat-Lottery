package com.daiphat.coreapi.application.dto.lotteries;

import java.time.LocalDate;

public record TicketAvailabilityKey(
        Long stationId,
        String numbers,
        LocalDate drawDate
) {
}
