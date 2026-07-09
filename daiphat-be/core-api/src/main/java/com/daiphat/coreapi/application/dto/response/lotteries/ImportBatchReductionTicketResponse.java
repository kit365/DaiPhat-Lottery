package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record ImportBatchReductionTicketResponse(
        Long id,
        String numbers,
        String serialNumber,
        Integer serialCount,
        String status
) {
}
