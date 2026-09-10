package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizeRedemptionZone;
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
        /** Line-level handover / custody status (authoritative for pickup vs rejection). */
        OrderDetailStatus orderDetailStatus,
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
        PrizePayoutRequestStatus activePayoutStatus,
        OrderType orderType,
        OrderReceiveType receiveType,
        /** Set only when this line was handed over; not the order-level mixed pickup time. */
        LocalDateTime actualPickedUpAt,
        LocalDateTime handedOverAt,
        LocalDateTime rejectedAt,
        PrizePayoutChannel claimChannel,
        boolean canClaimOnline,
        boolean requiresStationOfficeRedemption,
        /** Online / customer-facing redemption deadline. */
        LocalDate customerRedemptionDeadline,
        /** Official station/issuer deadline — last day the ticket can still be redeemed at counter. */
        LocalDate issuerRedemptionDeadline,
        PrizeRedemptionZone redemptionZone,
        /** Calendar days remaining until issuer deadline (0 when locked). */
        Integer daysRemainingToIssuer
) {
}
