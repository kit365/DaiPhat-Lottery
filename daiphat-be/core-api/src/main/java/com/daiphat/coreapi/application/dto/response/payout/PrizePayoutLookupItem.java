package com.daiphat.coreapi.application.dto.response.payout;

import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutTicketOrigin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PrizePayoutLookupItem(
        Long orderDetailId,
        Long serialId,
        Long stationId,
        String stationName,
        LocalDate drawDate,
        String serialNumber,
        String ticketNumbers,
        TicketDrawResultStatus prizeStatus,
        String prizeCode,
        String prizeDisplayName,
        BigDecimal grossAmount,
        BigDecimal taxAmount,
        BigDecimal commissionAmount,
        BigDecimal netAmount,
        PrizePayoutTicketOrigin ticketOrigin,
        PrizePayoutOwnershipVerificationLevel ownershipVerificationLevel,
        boolean requiresManualOwnershipConfirm,
        boolean requiresRecipientIdentity,
        boolean requiresRecipientIdImage,
        boolean requiresFourEyes,
        BigDecimal taxThreshold,
        OrderType orderType,
        String orderCode,
        UUID customerId,
        String customerName,
        String orderGuestName,
        String phone,
        String winningNumber,
        String matchFrom,
        Integer matchDigits,
        boolean alreadyRequested,
        SerialPayoutState payoutState
) {
}
