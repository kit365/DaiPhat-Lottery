package com.daiphat.coreapi.application.dto.response.payout;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record PrizePayoutRequestResponse(
        Long id,
        String requestCode,
        UUID customerId,
        String customerName,
        UUID orderId,
        String orderCode,
        Long orderDetailId,
        Long serialId,
        String serialNumber,
        String numbers,
        String stationName,
        LocalDate drawDate,
        String prizeCode,
        String prizeDisplayName,
        BigDecimal grossAmount,
        Long bankAccountId,
        String bankName,
        String bankAccountNumber,
        String accountHolderName,
        PrizePayoutRequestStatus status,
        String rejectReason,
        String transferEvidenceUrl,
        LocalDateTime completedAt,
        UUID completedBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LotteryTicketSerialStatus serialStatus,
        SerialPayoutState payoutState
) {
}
