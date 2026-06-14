package com.daiphat.coreapi.application.port.out.order;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

public interface PaymentCountdownCachePort {

    void start(UUID orderId, Duration ttl);

    Optional<Long> getRemainingSeconds(UUID orderId);

    void clear(UUID orderId);
}
