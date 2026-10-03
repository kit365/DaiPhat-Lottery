package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Builder
public record InspectableReturnTicketResponse(
        Long ticketId,
        String ticketNumbers,
        LocalDate drawDate,
        Long lotteryStationId,
        String lotteryStationName,
        Long targetReturnBatchLineId,
        BigDecimal ticketPrice,
        List<InspectableReturnSerialResponse> serials
) {
}
