package com.daiphat.coreapi.application.dto.response.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record SupportTicketStaffSummaryResponse(
        Long id,
        Long ticketCategoryId,
        String title,
        TicketStatus status,
        UUID customerId,
        String customerName,
        UUID assignedTo,
        String assignedToName,
        String refId,
        TicketRefType refType,
        LocalDateTime dueAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
