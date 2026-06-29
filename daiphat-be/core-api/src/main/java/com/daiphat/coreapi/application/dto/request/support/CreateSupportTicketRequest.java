package com.daiphat.coreapi.application.dto.request.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateSupportTicketRequest(
        @NotNull Long ticketCategoryId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank String description,
        @Size(max = 100) String refId,
        TicketRefType refType
) {
}
