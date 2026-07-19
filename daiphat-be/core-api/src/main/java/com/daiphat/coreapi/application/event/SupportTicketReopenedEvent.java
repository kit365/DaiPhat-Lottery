package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record SupportTicketReopenedEvent(
        Long ticketId,
        String title,
        String categoryName,
        UUID customerId
) {
}
