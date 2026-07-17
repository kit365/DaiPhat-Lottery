package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record SupportTicketCreatedEvent(
        Long ticketId,
        String title,
        UUID customerId
) {
}
