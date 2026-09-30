package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.orders.OrderCancelReasonDefaults;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderCancellationRefundServiceTest {

    @Mock private OrderRepositoryPort orderRepository;
    @Mock private RefundRequestRepositoryPort refundRepository;
    @Mock private OrderDetailSerialRepositoryPort detailSerialRepository;
    @Mock private LotteryTicketServicePort ticketService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private OrderCancellationRefundService service;

    @BeforeEach
    void setUp() {
        service = new OrderCancellationRefundService(
                orderRepository,
                refundRepository,
                detailSerialRepository,
                ticketService,
                eventPublisher);
    }

    @Test
    void preparationTimeoutCancelsLinksRefundReleasesTicketsAndPublishesEvents() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        OrderDetailModel detail = OrderDetailModel.builder()
                .id(11L)
                .lotteryTicketSerialId(101L)
                .allocatedSerialIds(List.of(101L))
                .price(BigDecimal.valueOf(10_000))
                .status(OrderDetailStatus.PROXY_HOLDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .userId(customerId)
                .orderCode("ORD-PREP-1")
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PREPARING)
                .orderDetails(List.of(detail))
                .build();
        when(refundRepository.save(any())).thenAnswer(invocation -> {
            RefundRequestModel refund = invocation.getArgument(0);
            refund.setId(88L);
            return refund;
        });
        when(refundRepository.linkOrderDetailsByOrderId(orderId, 88L)).thenReturn(1);
        when(refundRepository.findOrderDetailIdsByRefundRequestId(88L)).thenReturn(List.of(11L));

        RefundRequestModel refund = service.cancelLockedOrder(
                order,
                OrderCancelReasonDefaults.SYSTEM_PREPARATION_TIMEOUT,
                OrderCancelType.SYSTEM_PREPARATION_TIMEOUT,
                RefundRequestRole.SYSTEM,
                "SYSTEM",
                true);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getCancelType()).isEqualTo(OrderCancelType.SYSTEM_PREPARATION_TIMEOUT);
        assertThat(order.getCancelReason()).isEqualTo(OrderCancelReasonDefaults.SYSTEM_PREPARATION_TIMEOUT);
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.REFUND_PENDING);
        assertThat(refund.getStatus()).isEqualTo(RefundRequestStatus.WAITING_FOR_INFO);
        assertThat(refund.getRequestRole()).isEqualTo(RefundRequestRole.SYSTEM);
        assertThat(refund.getRefundReason()).isEqualTo(OrderCancelReasonDefaults.SYSTEM_PREPARATION_TIMEOUT);
        assertThat(refund.getRefundAmount()).isEqualByComparingTo("10000");
        assertThat(refund.getOrderDetailIds()).containsExactly(11L);
        verify(orderRepository).save(order);
        verify(ticketService).returnSoldTicketForOrder(101L);
        verify(eventPublisher).publishEvent(any(RefundRequestStatusChangedEvent.class));
        verify(eventPublisher).publishEvent(any(OrderStatusChangedEvent.class));
    }

    @Test
    void partialExistingRefundReleasesAndLinksOnlyRemainingDetails() {
        UUID orderId = UUID.randomUUID();
        OrderDetailModel alreadyLinked = OrderDetailModel.builder()
                .id(21L)
                .refundRequestId(70L)
                .lotteryTicketSerialId(201L)
                .price(BigDecimal.valueOf(10_000))
                .status(OrderDetailStatus.REFUND_PENDING)
                .build();
        OrderDetailModel remaining = OrderDetailModel.builder()
                .id(22L)
                .lotteryTicketSerialId(202L)
                .price(BigDecimal.valueOf(20_000))
                .status(OrderDetailStatus.PROXY_HOLDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .userId(UUID.randomUUID())
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PREPARING)
                .orderDetails(List.of(alreadyLinked, remaining))
                .build();
        when(refundRepository.save(any())).thenAnswer(invocation -> {
            RefundRequestModel refund = invocation.getArgument(0);
            refund.setId(89L);
            return refund;
        });
        when(refundRepository.linkOrderDetailsByOrderId(orderId, 89L)).thenReturn(1);
        when(refundRepository.findOrderDetailIdsByRefundRequestId(89L)).thenReturn(List.of(22L));

        RefundRequestModel refund = service.cancelLockedOrder(
                order,
                OrderCancelReasonDefaults.SYSTEM_PREPARATION_TIMEOUT,
                OrderCancelType.SYSTEM_PREPARATION_TIMEOUT,
                RefundRequestRole.SYSTEM,
                "SYSTEM",
                true);

        assertThat(refund.getRefundAmount()).isEqualByComparingTo("20000");
        verify(ticketService, never()).returnSoldTicketForOrder(201L);
        verify(ticketService).returnSoldTicketForOrder(202L);
    }

    @Test
    void allDetailsAlreadyLinkedCancelsWithoutCreatingDuplicateRefund() {
        UUID orderId = UUID.randomUUID();
        OrderDetailModel linked = OrderDetailModel.builder()
                .id(31L)
                .refundRequestId(71L)
                .lotteryTicketSerialId(301L)
                .price(BigDecimal.valueOf(10_000))
                .status(OrderDetailStatus.REFUND_PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .userId(UUID.randomUUID())
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PREPARING)
                .orderDetails(List.of(linked))
                .build();

        RefundRequestModel refund = service.cancelLockedOrder(
                order,
                OrderCancelReasonDefaults.SYSTEM_PREPARATION_TIMEOUT,
                OrderCancelType.SYSTEM_PREPARATION_TIMEOUT,
                RefundRequestRole.SYSTEM,
                "SYSTEM",
                true);

        assertThat(refund).isNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(refundRepository, never()).save(any());
        verify(ticketService, never()).returnSoldTicketForOrder(301L);
        verify(eventPublisher).publishEvent(any(OrderStatusChangedEvent.class));
    }
}
