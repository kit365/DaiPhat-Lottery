package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ReturnInspectableSerialData(
        Long serialId,
        String serialNumber,
        LotteryTicketSerialStatus status,
        TicketCondition ticketCondition,
        Long ticketId,
        String ticketNumbers,
        LocalDate drawDate,
        Long stationId,
        String stationName,
        Long importBatchLineId,
        BigDecimal importCost,
        BigDecimal ticketPrice
) {
}
