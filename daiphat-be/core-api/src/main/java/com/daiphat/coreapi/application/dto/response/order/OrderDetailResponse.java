package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Builder
public record OrderDetailResponse(
        Long id,
        Long lotteryTicketId,
        Long lotteryTicketSerialId,
        Long stationId,
        String stationName,
        String province,
        String numbers,
        LocalDate drawDate,
        /** Physical ticket serial, exposed for backwards compatibility. */
        String ticketImg,
        String serialNumber,
        /** Mobile-friendly alias for the ticket's printed serial/symbol. */
        String symbol,
        /** Current product is traditional lottery; retained as an explicit client contract. */
        String ticketType,
        /** Current physical serial status (SOLD, DAMAGED, ...). */
        LotteryTicketSerialStatus serialStatus,
        String serialStatusDisplayName,
        Long replacedByTicketId,
        Long replacedByTicketSerialId,
        BigDecimal price,
        Integer quantity,
        /** Order-detail lifecycle status (SOLD, HANDOVER_IN_PROGRESS, ...). */
        OrderDetailStatus status,
        String rejectionReason,
        LocalDateTime rejectedAt,
        UUID rejectedBy,
        LocalDateTime handedOverAt,
        UUID handedOverBy,
        boolean hasReplacement,
        List<Long> allocatedSerialIds,
        List<OrderDetailAllocatedSerialResponse> allocatedSerials
) {
}
