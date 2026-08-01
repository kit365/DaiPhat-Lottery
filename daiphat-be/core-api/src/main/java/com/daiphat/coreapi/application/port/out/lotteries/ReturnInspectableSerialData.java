package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public record ReturnInspectableSerialData(
        Long serialId,
        String serialNumber,
        LotteryTicketSerialStatus status,
        Long ticketId,
        String ticketNumbers,
        LocalDate drawDate,
        Long stationId,
        String stationName,
        Long importBatchLineId,
        BigDecimal importCost
) {
}
