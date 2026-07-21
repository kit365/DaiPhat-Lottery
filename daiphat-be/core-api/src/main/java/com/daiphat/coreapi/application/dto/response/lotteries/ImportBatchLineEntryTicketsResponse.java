package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record ImportBatchLineEntryTicketsResponse(
        Long importBatchId,
        Long importBatchLineId,
        List<ImportBatchLineEntryTicketResponse> tickets
) {
}
