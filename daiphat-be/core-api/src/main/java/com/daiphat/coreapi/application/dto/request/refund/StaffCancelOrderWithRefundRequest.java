package com.daiphat.coreapi.application.dto.request.refund;

import com.daiphat.coreapi.application.dto.request.order.TicketIncidentItemRequest;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record StaffCancelOrderWithRefundRequest(
        @NotNull OrderCancelType cancelType,
        @Size(max = 500) String cancelReason,
        List<TicketIncidentItemRequest> incidents
) {
}
