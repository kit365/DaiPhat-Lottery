package com.daiphat.coreapi.application.dto.response.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record TicketCategoryResponse(
        Long id,
        String name,
        String code,
        String description,
        int priority,
        TicketRefType requiredRefType,
        Long parentId,
        boolean isActive
) {
}
