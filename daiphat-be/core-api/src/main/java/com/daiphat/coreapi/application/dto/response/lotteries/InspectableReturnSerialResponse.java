package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record InspectableReturnSerialResponse(
        Long serialId,
        String serialNumber,
        LotteryTicketSerialStatus status,
        String statusLabel,
        Long ticketId,
        String ticketNumbers,
        LocalDate drawDate,
        Long lotteryStationId,
        String lotteryStationName,
        Long returnBatchLineId,
        Long importBatchLineId,
        BigDecimal importCost
) {
}
