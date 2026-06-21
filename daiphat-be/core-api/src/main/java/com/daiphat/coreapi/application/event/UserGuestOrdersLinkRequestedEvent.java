package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record UserGuestOrdersLinkRequestedEvent(
        UUID userId,
        String email
) {
}
