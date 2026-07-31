package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Builder
public record OrderDetailResponse(
        Long id,
        Long lotteryTicketId,
        Long lotteryTicketSerialId,
        Long stationId,
        String stationName,
        String numbers,
        LocalDate drawDate,
        String ticketImg,
        String serialNumber,
        LotteryTicketSerialStatus serialStatus,
        String serialStatusDisplayName,
        Long replacedByTicketId,
        Long replacedByTicketSerialId,
        BigDecimal price,
        Integer quantity,
        OrderDetailStatus status,
        boolean hasReplacement,
        List<Long> allocatedSerialIds,
        List<OrderDetailAllocatedSerialResponse> allocatedSerials
) {
}
