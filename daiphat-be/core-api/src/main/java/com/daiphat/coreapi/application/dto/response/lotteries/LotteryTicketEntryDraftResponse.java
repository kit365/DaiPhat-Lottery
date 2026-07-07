package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSectionPayload;

import java.time.LocalDateTime;
import java.util.List;

public record LotteryTicketEntryDraftResponse(
        Long importBatchLineId,
        List<TicketEntryDraftSectionPayload> ticketSections,
        LocalDateTime updatedAt
) {
}
