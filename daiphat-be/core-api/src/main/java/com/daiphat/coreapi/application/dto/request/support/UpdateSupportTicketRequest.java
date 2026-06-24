package com.daiphat.coreapi.application.dto.request.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import jakarta.validation.constraints.Size;

public record UpdateSupportTicketRequest(
        @Size(max = 200) String title,
        String description,
        @Size(max = 100) String refId,
        TicketRefType refType
) {
}
