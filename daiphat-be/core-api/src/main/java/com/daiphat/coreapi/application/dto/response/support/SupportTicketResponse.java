package com.daiphat.coreapi.application.dto.response.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SupportTicketResponse(
        Long id,
        Long ticketCategoryId,
        UUID customerId,
        UUID assignedTo,
        String title,
        String description,
        String attachmentUrl,
        String refId,
        TicketRefType refType,
        TicketStatus status,
        String response,
        LocalDateTime resolvedAt,
        LocalDateTime dueAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<SupportTicketCommentResponse> comments,
        String customerName,
        String assignedToName,
        String ticketCategoryName,
        String ticketCategoryCode
) {
}
