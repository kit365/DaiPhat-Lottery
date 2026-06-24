package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record SupportTicketResolvedEvent(
        Long ticketId,
        UUID customerId
) {
}
