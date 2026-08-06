package com.daiphat.coreapi.domain.service.streetagent;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorDraftReservationTest {

    @Test
    void expires_after_configured_ttl_minutes() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 8, 4, 8, 0);
        var reservation = VendorDraftReservation.create(createdAt, 15);

        assertThat(reservation.expiresAt()).isEqualTo(createdAt.plusMinutes(15));
        assertThat(reservation.isExpired(createdAt.plusMinutes(14))).isFalse();
        assertThat(reservation.isExpired(createdAt.plusMinutes(15))).isTrue();
    }

    @Test
    void respects_custom_ttl() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 8, 4, 8, 0);
        var reservation = VendorDraftReservation.create(createdAt, 30);

        assertThat(reservation.expiresAt()).isEqualTo(createdAt.plusMinutes(30));
        assertThat(reservation.isExpired(createdAt.plusMinutes(29))).isFalse();
        assertThat(reservation.isExpired(createdAt.plusMinutes(30))).isTrue();
    }

    @Test
    void rejects_invalid_ttl() {
        assertThatThrownBy(() -> VendorDraftReservation.create(LocalDateTime.now(), 0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
