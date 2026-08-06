package com.daiphat.coreapi.domain.service.streetagent;

import java.time.LocalDateTime;

public record VendorDraftReservation(LocalDateTime expiresAt) {

    public static VendorDraftReservation create(LocalDateTime now, int ttlMinutes) {
        if (now == null) {
            throw new IllegalArgumentException("Reservation time is required");
        }
        if (ttlMinutes < 1) {
            throw new IllegalArgumentException("Reservation TTL must be at least 1 minute");
        }
        return new VendorDraftReservation(now.plusMinutes(ttlMinutes));
    }

    public boolean isExpired(LocalDateTime now) {
        return now != null && !now.isBefore(expiresAt);
    }
}
