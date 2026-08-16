package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record SettlementResolvableSerialResponse(
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
