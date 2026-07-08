package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TransactionRepositoryAdapter implements TransactionRepositoryPort {

    private final TransactionRepository transactionRepository;

    @Override
    public Optional<LocalDateTime> findLatestPaymentSuccessAt(UUID orderId) {
        if (orderId == null) {
            return Optional.empty();
        }
        return transactionRepository.findLatestPaymentSuccessAt(orderId);
    }
}
