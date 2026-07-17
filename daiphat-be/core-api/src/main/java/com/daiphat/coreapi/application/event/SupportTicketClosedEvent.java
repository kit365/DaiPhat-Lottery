package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record SupportTicketClosedEvent(
        Long ticketId,
        UUID customerId,
        boolean autoClosed
) {
}
