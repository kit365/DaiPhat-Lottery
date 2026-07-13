package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
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
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.atLeastOnce;
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
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort = mock(LotteryTicketSerialServicePort.class);
    private final com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort =
            mock(com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort.class);
    private final RefundApplicationMapper refundApplicationMapper = mock(RefundApplicationMapper.class);
    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final TransactionRepositoryPort transactionRepositoryPort = mock(TransactionRepositoryPort.class);

    private OrderRefundGraceService orderRefundGraceService;
    private OrderRefundPolicyService orderRefundPolicyService;
    private OrderRefundService orderRefundService;

    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        orderRefundGraceService = new OrderRefundGraceService(
                systemConfigRepositoryPort,
                refundRequestRepositoryPort,
                transactionRepositoryPort);

        OrderRefundProperties refundProperties = new OrderRefundProperties();
        orderRefundPolicyService = new OrderRefundPolicyService(
                systemConfigRepositoryPort,
                refundRequestRepositoryPort,
                refundProperties);

        orderRefundService = new OrderRefundService(
                orderRepositoryPort,
                refundRequestRepositoryPort,
                userBankAccountRepositoryPort,
                lotteryTicketServicePort,
                lotteryTicketSerialServicePort,
                orderDetailSerialRepositoryPort,
                refundApplicationMapper,
                orderRefundGraceService,
                orderRefundPolicyService,
                eventPublisher);

        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("30").build()));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.MAX_REFUND_REQUESTS_PER_DAY.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("3").build()));
        lenient().when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(any(), any())).thenReturn(0L);
        lenient().when(refundRequestRepositoryPort.linkOrderDetailsByOrderId(any(), any())).thenReturn(1);
        lenient().when(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(any())).thenReturn(List.of(1L));
    }

    @Test
    @DisplayName("refundPaidOrder: PREPARING within grace creates READY_TO_PAY refund, cancels order, and returns tickets")
    void refundPaidOrder_preparingCreatesPendingRefund() {
        OrderModel order = orderBuilder(OrderStatus.PREPARING).build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refundApplicationMapper.toRefundResponse(any(), any())).thenReturn(null);

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đổi ý", 5L));

        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundRequestRepositoryPort).save(refundCaptor.capture());
        assertThat(refundCaptor.getValue().getStatus()).isEqualTo(RefundRequestStatus.READY_TO_PAY);

        verify(orderRepositoryPort).save(any());
        verify(lotteryTicketServicePort, atLeastOnce()).returnSoldTicketForOrder(any());
    }

    @Test
    @DisplayName("refundPaidOrder: rejects when grace period expired from payment time")
    void refundPaidOrder_rejectsExpiredGrace() {
        OrderModel order = orderBuilder(OrderStatus.PREPARING)
                .transactions(List.of(completedPayment(LocalDateTime.now().minusMinutes(31))))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 1L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_WINDOW_EXPIRED);
    }

    @Test
    @DisplayName("refundPaidOrder: PAID within grace creates READY_TO_PAY refund, cancels order, and returns tickets")
    void refundPaidOrder_paidCreatesPendingRefund() {
        OrderModel order = orderBuilder(OrderStatus.PAID).build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refundApplicationMapper.toRefundResponse(any(), any())).thenReturn(null);

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đổi ý", 5L));

        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundRequestRepositoryPort).save(refundCaptor.capture());
        assertThat(refundCaptor.getValue().getStatus()).isEqualTo(RefundRequestStatus.READY_TO_PAY);

        verify(orderRepositoryPort).save(any());
        verify(lotteryTicketServicePort, atLeastOnce()).returnSoldTicketForOrder(any());
        verify(eventPublisher).publishEvent(any(RefundRequestStatusChangedEvent.class));
    }

    @Test
    @DisplayName("refundPaidOrder: rejects when order already has a refund request")
    void refundPaidOrder_rejectsWhenRefundAlreadyExists() {
        OrderModel order = orderBuilder(OrderStatus.PREPARING).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(true);

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 1L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);

        verify(refundRequestRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("refundPaidOrder: PAID with grouped order detail releases all allocated serials immediately")
    void refundPaidOrder_paidReleasesAllocatedStock() {
        OrderModel order = orderBuilder(OrderStatus.PAID)
                .orderDetails(List.of(OrderDetailModel.builder()
                        .id(1L)
                        .lotteryTicketId(100L)
                        .quantity(3)
                        .price(BigDecimal.valueOf(10000))
                        .allocatedSerialIds(List.of(11L, 12L, 13L))
                        .build()))
                .totalAmount(BigDecimal.valueOf(30000))
                .build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refundApplicationMapper.toRefundResponse(any(), any())).thenReturn(null);

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đổi ý", 5L));

        verify(lotteryTicketServicePort).returnSoldTicketForOrder(11L);
        verify(lotteryTicketServicePort).returnSoldTicketForOrder(12L);
        verify(lotteryTicketServicePort).returnSoldTicketForOrder(13L);
        verify(orderRepositoryPort).save(any());
    }

    @Test
    @DisplayName("refundPaidOrder: links all OrderDetail rows and publishes refund notification event")
    void refundPaidOrder_linksOrderDetailsAndPublishesEvent() {
        OrderDetailModel detail1 = OrderDetailModel.builder()
                .id(11L)
                .lotteryTicketSerialId(101L)
                .price(BigDecimal.valueOf(10000))
                .build();
        OrderDetailModel detail2 = OrderDetailModel.builder()
                .id(12L)
                .lotteryTicketSerialId(102L)
                .price(BigDecimal.valueOf(10000))
                .build();
        OrderModel order = orderBuilder(OrderStatus.PAID)
                .orderDetails(List.of(detail1, detail2))
                .totalAmount(BigDecimal.valueOf(20000))
                .build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> {
            RefundRequestModel model = inv.getArgument(0);
            model.setId(99L);
            return model;
        });
        when(refundRequestRepositoryPort.linkOrderDetailsByOrderId(orderId, 99L)).thenReturn(2);
        when(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(99L))
                .thenReturn(List.of(11L, 12L));
        when(refundApplicationMapper.toRefundResponse(any(), any())).thenReturn(null);

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đặt nhầm đơn", 5L));

        verify(refundRequestRepositoryPort).linkOrderDetailsByOrderId(orderId, 99L);
        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundApplicationMapper).toRefundResponse(refundCaptor.capture(), any());
        assertThat(refundCaptor.getValue().getOrderDetailIds()).containsExactly(11L, 12L);
        assertThat(refundCaptor.getValue().getOrderId()).isEqualTo(orderId);

        ArgumentCaptor<RefundRequestStatusChangedEvent> eventCaptor =
                ArgumentCaptor.forClass(RefundRequestStatusChangedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().refundRequestId()).isEqualTo(99L);
        assertThat(eventCaptor.getValue().customerId()).isEqualTo(customerId);
        assertThat(eventCaptor.getValue().orderId()).isEqualTo(orderId);
        assertThat(eventCaptor.getValue().orderCode()).isEqualTo("ORD-001");
        assertThat(eventCaptor.getValue().status()).isEqualTo(RefundRequestStatus.READY_TO_PAY);
    }

    @Test
    @DisplayName("refundPaidOrder: rejects second refund when OrderDetails already linked (duplicate)")
    void refundPaidOrder_rejectsDuplicateViaLinkRace() {
        OrderModel order = orderBuilder(OrderStatus.PAID).build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> {
            RefundRequestModel model = inv.getArgument(0);
            model.setId(50L);
            return model;
        });
        when(refundRequestRepositoryPort.linkOrderDetailsByOrderId(orderId, 50L)).thenReturn(0);

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 5L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("refundPaidOrder: ACCESS_DENIED when order is not owned by customer")
    void refundPaidOrder_accessDeniedForOtherCustomer() {
        OrderModel order = orderBuilder(OrderStatus.PAID)
                .userId(UUID.randomUUID())
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 5L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        verify(refundRequestRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("refundPaidOrder: rejects mismatched bank account")
    void refundPaidOrder_rejectsBankAccountMismatch() {
        OrderModel order = orderBuilder(OrderStatus.PAID).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 5L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH);

        verify(refundRequestRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("refundPaidOrder: rejects when daily refund limit exceeded")
    void refundPaidOrder_rejectsDailyLimit() {
        OrderModel order = orderBuilder(OrderStatus.PAID).build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(any(), any())).thenReturn(3L);

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 5L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_DAILY_LIMIT_EXCEEDED);

        verify(refundRequestRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("refundPaidOrder: ORDER_NOT_FOUND when order missing")
    void refundPaidOrder_orderNotFound() {
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 5L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_NOT_FOUND);
    }

    @Test
    @DisplayName("getRefundEligibility: ACCESS_DENIED for non-owner")
    void getRefundEligibility_accessDenied() {
        OrderModel order = orderBuilder(OrderStatus.PAID)
                .userId(UUID.randomUUID())
                .build();
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderRefundService.getRefundEligibility(orderId, customerId))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("getRefundEligibility: surfaces dailyLimitReached from System_Config policy")
    void getRefundEligibility_dailyLimitReached() {
        OrderModel order = orderBuilder(OrderStatus.PAID).build();
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(any(), any())).thenReturn(3L);

        var response = orderRefundService.getRefundEligibility(orderId, customerId);

        assertThat(response.eligible()).isFalse();
        assertThat(response.dailyLimitReached()).isTrue();
        assertThat(response.maxRefundRequestsPerDay()).isEqualTo(3);
        assertThat(response.refundRequestsSubmittedToday()).isEqualTo(3L);
    }

    private OrderModel.OrderModelBuilder orderBuilder(OrderStatus status) {
        return OrderModel.builder()
                .id(orderId)
                .userId(customerId)
                .orderCode("ORD-001")
                .orderType(OrderType.ONLINE)
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
