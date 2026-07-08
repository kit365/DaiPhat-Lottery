package com.daiphat.coreapi.application.port.out.order;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepositoryPort {

    Optional<LocalDateTime> findLatestPaymentSuccessAt(UUID orderId);
}
