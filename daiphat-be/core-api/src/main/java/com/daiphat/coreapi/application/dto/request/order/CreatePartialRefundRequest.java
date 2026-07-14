package com.daiphat.coreapi.application.dto.request.order;

import java.util.List;

public record CreatePartialRefundRequest(
        List<TicketIncidentItemRequest> incidents,
        String refundNote
) {
}
