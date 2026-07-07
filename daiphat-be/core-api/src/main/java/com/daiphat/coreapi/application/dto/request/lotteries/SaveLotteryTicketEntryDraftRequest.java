package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SaveLotteryTicketEntryDraftRequest(
        @NotNull(message = "Dòng phiếu nhập lô không được để trống")
        Long importBatchLineId,

        @Valid
        List<TicketEntryDraftSectionPayload> ticketSections
) {
}
