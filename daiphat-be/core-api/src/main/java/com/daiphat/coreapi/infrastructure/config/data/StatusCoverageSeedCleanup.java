package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * Shared reset for status-coverage orders. Must run before IBSTATUS-* serials are deleted
 * because {@code order_details} references {@code lottery_ticket_serials}.
 */
@Slf4j
final class StatusCoverageSeedCleanup {

    static final String ORDER_CODE_PREFIX = "ORD-STATUS-";
    static final String PAYMENT_REF_PREFIX = "PAYOS-STATUS-";

    private StatusCoverageSeedCleanup() {
    }

    static void resetOrders(
            TransactionRepository transactionRepository,
            OrderRepository orderRepository
    ) {
        int removedTransactions = transactionRepository.deleteByPaymentRefStartingWith(PAYMENT_REF_PREFIX);
        List<OrderEntity> seedOrders = orderRepository.findByOrderCodeStartingWith(ORDER_CODE_PREFIX);
        if (!seedOrders.isEmpty()) {
            orderRepository.deleteAll(seedOrders);
            orderRepository.flush();
        }
        if (removedTransactions > 0 || !seedOrders.isEmpty()) {
            log.info(
                    "Removed previous status-coverage orders: orders={}, transactions={}.",
                    seedOrders.size(),
                    removedTransactions
            );
        }
    }
}
