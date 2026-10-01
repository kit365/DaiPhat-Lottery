package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.service.lotteries.TicketSalesCutoffPolicy;
import com.daiphat.coreapi.application.service.refund.OrderCancellationRefundService;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.orders.OrderCancelReasonDefaults;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderPreparationExpiryWorkerTest {

    @Mock private OrderRepositoryPort orderRepository;
    @Mock private TicketSalesCutoffPolicy cutoffPolicy;
    @Mock private OrderCancellationRefundService cancellationRefundService;
    @Mock private VietnamClock vietnamClock;

    private OrderPreparationExpiryWorker worker;

    @BeforeEach
    void setUp() {
        worker = new OrderPreparationExpiryWorker(
                orderRepository,
                cutoffPolicy,
                cancellationRefundService,
                vietnamClock);
    }

    @Test
    void exactCutoffCancelsWithSystemReasonAndRole() {
        UUID orderId = UUID.randomUUID();
        LocalDateTime cutoff = LocalDateTime.of(2026, 9, 30, 15, 0);
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .userId(UUID.randomUUID())
                .status(OrderStatus.PREPARING)
                .build();
        when(orderRepository.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(cutoffPolicy.resolveEarliestCutoff(order)).thenReturn(Optional.of(cutoff));
        when(vietnamClock.now()).thenReturn(cutoff);

        assertThat(worker.expireSingle(orderId)).isTrue();
        verify(cancellationRefundService).cancelLockedOrder(
                order,
                OrderCancelReasonDefaults.SYSTEM_PREPARATION_TIMEOUT,
                OrderCancelType.SYSTEM_PREPARATION_TIMEOUT,
                RefundRequestRole.SYSTEM,
                "SYSTEM",
                true);
    }

    @Test
    void beforeCutoffDoesNothing() {
        UUID orderId = UUID.randomUUID();
        LocalDateTime cutoff = LocalDateTime.of(2026, 9, 30, 15, 0);
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .userId(UUID.randomUUID())
                .status(OrderStatus.PREPARING)
                .build();
        when(orderRepository.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(cutoffPolicy.resolveEarliestCutoff(order)).thenReturn(Optional.of(cutoff));
        when(vietnamClock.now()).thenReturn(cutoff.minusNanos(1));

        assertThat(worker.expireSingle(orderId)).isFalse();
        verify(cancellationRefundService, never()).cancelLockedOrder(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    void alreadyProcessedOrderIsIdempotent() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).status(OrderStatus.CANCELLED).build();
        when(orderRepository.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        assertThat(worker.expireSingle(orderId)).isFalse();
        verify(cutoffPolicy, never()).resolveEarliestCutoff(order);
    }

    @Test
    void malformedOrderWithoutCustomerIsLeftUnchanged() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).status(OrderStatus.PREPARING).build();
        when(orderRepository.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        assertThat(worker.expireSingle(orderId)).isFalse();
        verify(cancellationRefundService, never()).cancelLockedOrder(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyBoolean());
    }
}
