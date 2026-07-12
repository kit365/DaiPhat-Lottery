package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepositoryPort {

    Optional<LocalDateTime> findLatestPaymentSuccessAt(UUID orderId);

    Optional<TransactionModel> findLatestByOrderIdAndType(UUID orderId, TransactionType type);

    TransactionModel save(TransactionModel transaction);
}
