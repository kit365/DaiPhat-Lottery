package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record SupportTicketAssignedEvent(
        Long ticketId,
        String title,
        String categoryName,
        UUID customerId,
        UUID staffId,
        String staffName
) {
}
