package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record BulkCreateLotteryTicketsResponse(
        List<LotteryTicketResponse> tickets,
        int importedSerialCount
) {
}
