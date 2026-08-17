package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;

import java.math.BigDecimal;

public record SettlementResolvableSerialRow(
        Long serialId,
        String serialNumber,
        LotteryTicketSerialStatus status,
        TicketCondition ticketCondition,
        String stationName,
        BigDecimal importCost,
        Long importBatchId,
        String importBatchCode
) {
}
