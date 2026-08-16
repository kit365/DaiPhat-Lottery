package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.service.order.OrderPaymentSuccessTimeResolver;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderRefundGraceService")
class OrderRefundGraceServiceTest {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final TransactionRepositoryPort transactionRepositoryPort = mock(TransactionRepositoryPort.class);

    private OrderRefundGraceService orderRefundGraceService;

    @BeforeEach
    void setUp() {
        orderRefundGraceService = new OrderRefundGraceService(
                systemConfigRepositoryPort,
                refundRequestRepositoryPort,
                new OrderPaymentSuccessTimeResolver(transactionRepositoryPort));

        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("30").build()));
    }

    @Test
    @DisplayName("evaluate: uses payment success time, not order createdAt")
    void evaluate_usesPaymentSuccessTimeNotCreatedAt() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(LocalDateTime.now().minusMinutes(5))
                        .amount(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.openWindow()).isTrue();
        assertThat(evaluation.paymentSuccessAt()).isEqualTo(order.getTransactions().getFirst().getPaidAt());
        assertThat(evaluation.remainingSeconds()).isPositive();
    }

    @Test
    @DisplayName("evaluate: recent createdAt does not override old paidAt")
    void evaluate_recentCreatedAtDoesNotOverrideOldPaidAt() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(LocalDateTime.now().minusMinutes(31))
                        .amount(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isFalse();
        assertThat(evaluation.remainingSeconds()).isZero();
        assertThat(evaluation.reason()).contains("kể từ khi thanh toán");
    }

    @Test
    @DisplayName("evaluate: falls back to DB when in-memory transactions are empty")
    void evaluate_fallsBackToDbWhenTransactionsEmpty() {
        UUID orderId = UUID.randomUUID();
        LocalDateTime paidAt = LocalDateTime.now().minusMinutes(5);
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of())
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(transactionRepositoryPort.findLatestPaymentSuccessAt(orderId)).thenReturn(Optional.of(paidAt));

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.paymentSuccessAt()).isEqualTo(paidAt);
        assertThat(evaluation.remainingSeconds()).isPositive();
    }

    @Test
    @DisplayName("evaluate: PREPARING without payment time from memory or DB is ineligible")
    void evaluate_preparingWithoutPaymentIsIneligible() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of())
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(transactionRepositoryPort.findLatestPaymentSuccessAt(orderId)).thenReturn(Optional.empty());

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isFalse();
        assertThat(evaluation.reason()).contains("thời gian thanh toán");
    }

    @Test
    @DisplayName("evaluate: refundDeadlineAt equals paymentSuccessAt plus grace minutes")
    void evaluate_refundDeadlineMatchesGraceFormula() {
        UUID orderId = UUID.randomUUID();
        LocalDateTime paidAt = LocalDateTime.now().minusMinutes(12).minusSeconds(15);

        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(paidAt)
                        .amount(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.paymentSuccessAt()).isEqualTo(paidAt);
        assertThat(evaluation.refundDeadlineAt()).isEqualTo(paidAt.plusMinutes(30));
        long expectedRemaining = Math.max(Duration.between(
                DrawScheduleUtils.nowVn(),
                paidAt.plusMinutes(30).atZone(DrawScheduleUtils.VIETNAM_ZONE)).getSeconds(), 0L);
        assertThat(evaluation.remainingSeconds()).isBetween(expectedRemaining - 2L, expectedRemaining + 2L);
    }

    @Test
    @DisplayName("evaluate: any existing refund request makes order ineligible (1:1)")
    void evaluate_existingRefundRequestIsIneligible() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(LocalDateTime.now().minusMinutes(5))
                        .amount(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(true);

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isFalse();
        assertThat(evaluation.reason()).isEqualTo("Đơn hàng đã có yêu cầu hoàn tiền.");
    }

    @Test
    @DisplayName("ensureEligible: throws REFUND_ORDER_ALREADY_REQUESTED when refund exists")
    void ensureEligible_throwsAlreadyRequested() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(LocalDateTime.now().minusMinutes(5))
                        .amount(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(true);

        assertThatThrownBy(() -> orderRefundGraceService.ensureEligible(order))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
    }

    @Test
    @DisplayName("evaluate: ignores COMPLETED refund rows when resolving payment time")
    void evaluate_ignoresRefundTransactions() {
        UUID orderId = UUID.randomUUID();
        LocalDateTime paidAt = LocalDateTime.now().minusMinutes(4);
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now())
                .transactions(List.of(
                        TransactionModel.builder()
                                .status(TransactionStatus.COMPLETED)
                                .type(TransactionType.REFUND)
                                .transactionType(TransactionBusinessType.ORDER_REFUND)
                                .paidAt(LocalDateTime.now())
                                .amount(BigDecimal.valueOf(10000))
                                .build(),
                        TransactionModel.builder()
                                .status(TransactionStatus.COMPLETED)
                                .type(TransactionType.ONLINE)
                                .transactionType(TransactionBusinessType.ORDER_PAYMENT)
                                .paidAt(paidAt)
                                .amount(BigDecimal.valueOf(10000))
                                .build()))
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.paymentSuccessAt()).isEqualTo(paidAt);
    }

    @Test
    @DisplayName("evaluate: uses updatedAt when paidAt is missing on COMPLETED payment")
    void evaluate_fallsBackToUpdatedAtWhenPaidAtMissing() {
        UUID orderId = UUID.randomUUID();
        LocalDateTime updatedAt = LocalDateTime.now().minusMinutes(3);
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PREPARING)
                .createdAt(LocalDateTime.now().minusHours(1))
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .type(null)
                        .paidAt(null)
                        .updatedAt(updatedAt)
                        .amount(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);

        var evaluation = orderRefundGraceService.evaluate(order);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.paymentSuccessAt()).isEqualTo(updatedAt);
        assertThat(evaluation.remainingSeconds()).isPositive();
    }
}
