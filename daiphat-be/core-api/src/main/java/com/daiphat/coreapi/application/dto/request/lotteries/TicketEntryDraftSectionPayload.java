package com.daiphat.coreapi.application.dto.request.lotteries;

import java.util.List;

public record TicketEntryDraftSectionPayload(
        String numbers,
        List<TicketEntryDraftSerialPayload> serials
) {
}
