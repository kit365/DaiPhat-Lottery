package com.daiphat.coreapi.application.dto.response.payout;

import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutTicketOrigin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PrizePayoutPreviewResponse(
        Long orderDetailId,
        Long serialId,
        String prizeCode,
        String prizeDisplayName,
        BigDecimal grossAmount,
        BigDecimal taxAmount,
        BigDecimal commissionAmount,
        BigDecimal netAmount,
        PrizePayoutChannel channel,
        boolean canClaimOnline,
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
        String serialNumber,
        String stationName,
        LocalDate drawDate,
        String ticketNumbers,
        String winningNumber,
        String matchFrom,
        Integer matchDigits
) {
}
