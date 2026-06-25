package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService.RefundGraceEvaluation;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderRefundService")
class OrderRefundServiceTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort = mock(UserBankAccountRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final RefundApplicationMapper refundApplicationMapper = mock(RefundApplicationMapper.class);
    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);

    private OrderRefundGraceService orderRefundGraceService;
    private OrderRefundService orderRefundService;

    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        orderRefundGraceService = new OrderRefundGraceService(
                systemConfigRepositoryPort,
                refundRequestRepositoryPort);

        orderRefundService = new OrderRefundService(
                orderRepositoryPort,
                refundRequestRepositoryPort,
                userBankAccountRepositoryPort,
                lotteryTicketServicePort,
                refundApplicationMapper,
                orderRefundGraceService,
                eventPublisher);

        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("30").build()));
    }

    @Test
    @DisplayName("refundPaidOrder: PREPARING within grace creates PENDING refund without cancelling order")
    void refundPaidOrder_preparingCreatesPendingRefund() {
        OrderModel order = orderBuilder(OrderStatus.PREPARING).build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsActiveByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refundApplicationMapper.toRefundResponse(any(), any())).thenReturn(null);

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đổi ý", 5L));

        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundRequestRepositoryPort).save(refundCaptor.capture());
        assertThat(refundCaptor.getValue().getStatus()).isEqualTo(RefundRequestStatus.PENDING);

        verify(orderRepositoryPort, never()).save(any());
        verify(lotteryTicketServicePort, never()).returnSoldTicketForOrder(any());
    }

    @Test
    @DisplayName("refundPaidOrder: rejects when grace period expired from payment time")
    void refundPaidOrder_rejectsExpiredGrace() {
        OrderModel order = orderBuilder(OrderStatus.PREPARING)
                .transactions(List.of(completedPayment(LocalDateTime.now().minusMinutes(31))))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsActiveByOrderId(orderId)).thenReturn(false);

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 1L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_WINDOW_EXPIRED);
    }

    @Test
    @DisplayName("refundPaidOrder: PAID within grace cancels order and creates READY_TO_PAY refund")
    void refundPaidOrder_paidSuccess() {
        OrderModel order = orderBuilder(OrderStatus.PAID).build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsActiveByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refundApplicationMapper.toRefundResponse(any(), any())).thenReturn(null);

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đổi ý", 5L));

        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundRequestRepositoryPort).save(refundCaptor.capture());
        assertThat(refundCaptor.getValue().getStatus()).isEqualTo(RefundRequestStatus.READY_TO_PAY);

        ArgumentCaptor<OrderModel> orderCaptor = ArgumentCaptor.forClass(OrderModel.class);
        verify(orderRepositoryPort).save(orderCaptor.capture());
        assertThat(orderCaptor.getValue().getStatus()).isEqualTo(OrderStatus.CANCELLED);

        verify(lotteryTicketServicePort).returnSoldTicketForOrder(11L);
        verify(eventPublisher).publishEvent(any(OrderStatusChangedEvent.class));
    }

    @Test
    @DisplayName("getRefundEligibility: PREPARING within grace is eligible")
    void getRefundEligibility_preparingEligible() {
        OrderModel order = orderBuilder(OrderStatus.PREPARING).build();
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsActiveByOrderId(orderId)).thenReturn(false);

        var response = orderRefundService.getRefundEligibility(orderId, customerId);

        assertThat(response.eligible()).isTrue();
        assertThat(response.graceMinutes()).isEqualTo(30);
        assertThat(response.remainingSeconds()).isNotNull().isPositive();
    }

    private OrderModel.OrderModelBuilder orderBuilder(OrderStatus status) {
        return OrderModel.builder()
                .id(orderId)
                .userId(customerId)
                .orderCode("ORD-001")
                .status(status)
                .totalAmount(BigDecimal.valueOf(20000))
                .createdAt(LocalDateTime.now().minusMinutes(60))
                .transactions(List.of(completedPayment(LocalDateTime.now().minusMinutes(5))))
                .orderDetails(List.of(OrderDetailModel.builder()
                        .id(1L)
                        .lotteryTicketSerialId(11L)
                        .price(BigDecimal.valueOf(20000))
                        .build()));
    }

    private TransactionModel completedPayment(LocalDateTime paidAt) {
        return TransactionModel.builder()
                .status(TransactionStatus.COMPLETED)
                .paidAt(paidAt)
                .amount(BigDecimal.valueOf(20000))
                .build();
    }
}
