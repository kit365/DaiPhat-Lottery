package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentReason;

public record TicketIncidentItemRequest(
        Long orderDetailId,
        TicketIncidentReason reason,
        Long replacementTicketId,
        String damagedReason,
        String damagedEvidenceUrl
) {
}
