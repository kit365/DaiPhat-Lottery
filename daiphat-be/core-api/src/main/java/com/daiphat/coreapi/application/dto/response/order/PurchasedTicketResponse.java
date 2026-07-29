package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record PurchasedTicketResponse(
        UUID orderId,
        String orderCode,
        Long orderDetailId,
        Long ticketId,
        Long serialId,
        String serialNumber,
        LotteryTicketSerialStatus serialStatus,
        SerialPayoutState payoutState,
        String numbers,
        String stationName,
        LocalDate drawDate,
        BigDecimal price,
        LocalDateTime purchasedAt,
        TicketDrawResultStatus drawResultStatus,
        String matchedPrizeCode,
        String matchedPrizeDisplayName,
        BigDecimal prizeAmount,
        Long activePayoutRequestId,
        PrizePayoutRequestStatus activePayoutStatus
) {
}
