package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.listener.RefundRequestEventListener;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * End-to-end style unit workflow for customer Cancel Order & Refund Request:
 * eligibility → create → link OrderDetails → publish event → notification.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Customer Cancel Order & Refund Request workflow")
class CustomerOrderRefundWorkflowTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort = mock(UserBankAccountRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final RefundTicketItemResolver refundTicketItemResolver = mock(RefundTicketItemResolver.class);
    private final com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort =
            mock(com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort.class);
    private final RefundApplicationMapper refundApplicationMapper = mock(RefundApplicationMapper.class);
    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final TransactionRepositoryPort transactionRepositoryPort = mock(TransactionRepositoryPort.class);
    private final NotificationServicePort notificationService = mock(NotificationServicePort.class);
    private final com.daiphat.coreapi.application.port.in.mail.EmailServicePort emailService =
            mock(com.daiphat.coreapi.application.port.in.mail.EmailServicePort.class);
    private final com.daiphat.coreapi.application.port.out.user.UserRepositoryPort userRepositoryPort =
            mock(com.daiphat.coreapi.application.port.out.user.UserRepositoryPort.class);

    private OrderRefundService orderRefundService;
    private RefundRequestEventListener refundRequestEventListener;

    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        OrderRefundGraceService graceService = new OrderRefundGraceService(
                systemConfigRepositoryPort, refundRequestRepositoryPort, transactionRepositoryPort);
        OrderRefundPolicyService policyService = new OrderRefundPolicyService(
                systemConfigRepositoryPort, refundRequestRepositoryPort, new OrderRefundProperties());

        orderRefundService = new OrderRefundService(
                orderRepositoryPort,
                refundRequestRepositoryPort,
                userBankAccountRepositoryPort,
                lotteryTicketServicePort,
                orderDetailSerialRepositoryPort,
                refundApplicationMapper,
                refundTicketItemResolver,
                graceService,
                policyService,
                eventPublisher);
        refundRequestEventListener = new RefundRequestEventListener(
                notificationService, emailService, userRepositoryPort);
        lenient().when(notificationService.createNotification(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(userRepositoryPort.findById(customerId)).thenReturn(Optional.of(
                com.daiphat.coreapi.domain.model.UserModel.builder()
                        .id(customerId)
                        .email("customer@example.com")
                        .firstName("Customer")
                        .build()));

        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("30").build()));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.MAX_REFUND_REQUESTS_PER_DAY.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("3").build()));
        lenient().when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(any(), any())).thenReturn(0L);
        lenient().when(refundTicketItemResolver.resolveFromOrder(any())).thenReturn(List.of());
    }

    @Test
    @DisplayName("happy path: open order → submit refund → details linked → notification with REFUND_REQUEST ref")
    void fullWorkflow_successCreatesRefundLinksDetailsAndNotifies() {
        OrderModel order = eligibleOrder();
        UserBankAccountModel bank = UserBankAccountModel.builder().id(9L).userId(customerId).build();

        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(9L, customerId)).thenReturn(Optional.of(bank));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> {
            RefundRequestModel model = inv.getArgument(0);
            model.setId(100L);
            return model;
        });
        when(refundRequestRepositoryPort.linkOrderDetailsByOrderId(orderId, 100L)).thenReturn(2);
        when(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(100L))
                .thenReturn(List.of(1L, 2L));
        when(refundApplicationMapper.toRefundResponse(any(), any())).thenReturn(null);

        var eligibility = orderRefundService.getRefundEligibility(orderId, customerId);
        assertThat(eligibility.eligible()).isTrue();
        assertThat(eligibility.dailyLimitReached()).isFalse();

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đặt nhầm đơn", 9L));

        verify(refundRequestRepositoryPort).linkOrderDetailsByOrderId(orderId, 100L);

        ArgumentCaptor<RefundRequestStatusChangedEvent> eventCaptor =
                ArgumentCaptor.forClass(RefundRequestStatusChangedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        RefundRequestStatusChangedEvent event = eventCaptor.getValue();
        assertThat(event.refundRequestId()).isEqualTo(100L);
        assertThat(event.status()).isEqualTo(RefundRequestStatus.READY_TO_PAY);
        assertThat(event.orderCode()).isEqualTo("ORD-WF-001");

        // AFTER_COMMIT listener path (invoked explicitly in unit workflow)
        refundRequestEventListener.handleRefundRequestStatusChanged(event);

        ArgumentCaptor<NotificationModel> notificationCaptor = ArgumentCaptor.forClass(NotificationModel.class);
        verify(notificationService, org.mockito.Mockito.atLeastOnce()).createNotification(notificationCaptor.capture());
        NotificationModel notification = notificationCaptor.getAllValues().stream()
                .filter(n -> n.getChannel() == com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel.IN_APP)
                .findFirst()
                .orElseThrow();
        assertThat(notification.getReferenceType()).isEqualTo(NotificationReferenceType.REFUND_REQUEST);
        assertThat(notification.getReferenceId()).isEqualTo("100");
        assertThat(notification.getUserId()).isEqualTo(customerId);
        assertThat(notification.getTitle()).contains("hoàn tiền");
    }

    @Test
    @DisplayName("failure path: duplicate refund aborts before notification (transactional rollback boundary)")
    void fullWorkflow_duplicateDoesNotNotify() {
        OrderModel order = eligibleOrder();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(true);

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đặt nhầm đơn", 9L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);

        verify(refundRequestRepositoryPort, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
        verify(notificationService, never()).createNotification(any());
    }

    private OrderModel eligibleOrder() {
        return OrderModel.builder()
                .id(orderId)
                .userId(customerId)
                .orderCode("ORD-WF-001")
                .status(OrderStatus.PAID)
                .totalAmount(BigDecimal.valueOf(20000))
                .createdAt(LocalDateTime.now().minusHours(2))
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(LocalDateTime.now().minusMinutes(5))
                        .amount(BigDecimal.valueOf(20000))
                        .build()))
                .orderDetails(List.of(
                        OrderDetailModel.builder().id(1L).lotteryTicketSerialId(11L)
                                .price(BigDecimal.valueOf(10000)).build(),
                        OrderDetailModel.builder().id(2L).lotteryTicketSerialId(12L)
                                .price(BigDecimal.valueOf(10000)).build()))
                .build();
    }
}
