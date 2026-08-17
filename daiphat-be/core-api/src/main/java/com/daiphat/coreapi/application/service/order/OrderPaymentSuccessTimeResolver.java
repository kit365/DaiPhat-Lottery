package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Resolves the customer payment instant used for refund grace and related windows.
 * Ignores refund/payout ledger rows even when they are COMPLETED.
 */
@Component
@RequiredArgsConstructor
public class OrderPaymentSuccessTimeResolver {

    private final TransactionRepositoryPort transactionRepositoryPort;

    public Optional<LocalDateTime> resolve(OrderModel order) {
        if (order == null) {
            return Optional.empty();
        }
        LocalDateTime fromMemory = fromLoadedTransactions(order);
        if (fromMemory != null) {
            return Optional.of(fromMemory);
        }
        UUID orderId = order.getId();
        if (orderId == null) {
            return Optional.empty();
        }
        return transactionRepositoryPort.findLatestPaymentSuccessAt(orderId);
    }

    private LocalDateTime fromLoadedTransactions(OrderModel order) {
        if (order.getTransactions() == null || order.getTransactions().isEmpty()) {
            return null;
        }
        return order.getTransactions().stream()
                .filter(OrderPaymentSuccessTimeResolver::isCompletedOrderPayment)
                .map(OrderPaymentSuccessTimeResolver::resolveTransactionPaymentTime)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }

    static boolean isCompletedOrderPayment(TransactionModel transaction) {
        if (transaction == null || transaction.getStatus() != TransactionStatus.COMPLETED) {
            return false;
        }
        if (transaction.getType() == TransactionType.REFUND) {
            return false;
        }
        TransactionBusinessType businessType = transaction.getTransactionType();
        if (businessType == null) {
            return true;
        }
        return businessType == TransactionBusinessType.ORDER_PAYMENT;
    }

    static LocalDateTime resolveTransactionPaymentTime(TransactionModel transaction) {
        if (transaction.getPaidAt() != null) {
            return transaction.getPaidAt();
        }
        if (transaction.getUpdatedAt() != null) {
            return transaction.getUpdatedAt();
        }
        return transaction.getCreatedAt();
    }
}
