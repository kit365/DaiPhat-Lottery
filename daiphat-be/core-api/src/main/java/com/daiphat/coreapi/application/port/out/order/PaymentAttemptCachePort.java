package com.daiphat.coreapi.application.port.out.order;

import java.time.Duration;

public interface PaymentAttemptCachePort {

    long incrementFailureAttempt(Long transactionId, Duration ttl);

    void clearFailureAttempts(Long transactionId);
}
