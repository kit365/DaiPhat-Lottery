package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import lombok.Builder;

@Builder
public record OrderDetailAllocatedSerialResponse(
        Long id,
        String serialNumber,
        LotteryTicketSerialStatus status,
        String statusDisplayName,
        String ticketImg,
        Long ticketId
) {
}
