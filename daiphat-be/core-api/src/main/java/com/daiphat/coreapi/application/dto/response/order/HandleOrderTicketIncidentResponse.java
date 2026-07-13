package com.daiphat.coreapi.application.dto.response.order;

import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentOutcome;
import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentReason;
import lombok.Builder;

import java.util.List;

@Builder
public record HandleOrderTicketIncidentResponse(
        List<TicketIncidentItemResult> results
) {
    @Builder
    public record TicketIncidentItemResult(
            Long orderDetailId,
            TicketIncidentOutcome outcome,
            TicketIncidentReason reason,
            String numbers,
            String stationName,
            String oldSerialNumber,
            String newSerialNumber,
            Long oldTicketSerialId,
            Long newTicketSerialId,
            String message
    ) {
    }
}
