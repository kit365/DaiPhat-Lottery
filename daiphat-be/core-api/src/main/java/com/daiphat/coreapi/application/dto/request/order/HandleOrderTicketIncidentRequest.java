package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentReason;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record HandleOrderTicketIncidentRequest(
        @NotEmpty List<@NotNull Long> orderDetailIds,
        @NotNull TicketIncidentReason reason,
        @Size(max = 500) String note
) {
}
