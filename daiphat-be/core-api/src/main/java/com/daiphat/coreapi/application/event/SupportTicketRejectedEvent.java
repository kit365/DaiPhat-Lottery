package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record SupportTicketRejectedEvent(
        Long ticketId,
        String title,
        String categoryName,
        UUID customerId
) {
}
