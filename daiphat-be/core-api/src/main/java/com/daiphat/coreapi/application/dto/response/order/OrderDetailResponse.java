package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record OrderDetailResponse(
        Long id,
        Long lotteryTicketId,
        Long lotteryTicketSerialId,
        Long replacedByTicketId,
        Long replacedByTicketSerialId,
        BigDecimal price,
        OrderDetailStatus status,
        List<OrderRefundResponse> refunds
) {
}
