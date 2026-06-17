package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.PaymentAttemptCachePort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategy;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategyFactory;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@DisplayName("TransactionService")
class TransactionServiceTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final UserLookupServicePort userLookupServicePort = mock(UserLookupServicePort.class);
    private final PaymentGatewayStrategyFactory paymentGatewayStrategyFactory = mock(PaymentGatewayStrategyFactory.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final PaymentCountdownCachePort paymentCountdownCachePort = mock(PaymentCountdownCachePort.class);
    private final PaymentAttemptCachePort paymentAttemptCachePort = mock(PaymentAttemptCachePort.class);
    private final PaymentGatewayStrategy gatewayStrategy = mock(PaymentGatewayStrategy.class);
    private final org.springframework.context.ApplicationEventPublisher applicationEventPublisher = mock(org.springframework.context.ApplicationEventPublisher.class);

    private TransactionService transactionService;

    @BeforeEach
    void setUp() {
        transactionService = new TransactionService(
                orderRepositoryPort,
                userLookupServicePort,
                paymentGatewayStrategyFactory,
                lotteryTicketServicePort,
                paymentCountdownCachePort,
                paymentAttemptCachePort,
                applicationEventPublisher
        );
    }

    @Test
    @DisplayName("processPayment: online payment phải persist gatewayOrderCode do gateway strategy gán")
    void processPayment_persistsGatewayOrderCodeAssignedByStrategy() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(13L)
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.valueOf(100_000))
                .status(TransactionStatus.PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.createPayment(order, transaction)).thenAnswer(invocation -> {
            transaction.setGateway(PaymentGateway.PAYOS);
            transaction.setGatewayOrderCode(5_000_013L);
            return new PaymentResult(
                    13L,
                    TransactionType.ONLINE,
                    PaymentGateway.PAYOS,
                    5_000_013L,
                    null,
                    "https://pay.payos.vn/web/abc",
                    TransactionStatus.PENDING.name()
            );
        });

        PaymentResult result = transactionService.processPayment(orderId, 13L, PaymentGateway.PAYOS);

        assertThat(result.transactionId()).isEqualTo(13L);
        assertThat(result.gateway()).isEqualTo(PaymentGateway.PAYOS);
        assertThat(result.gatewayOrderCode()).isEqualTo(5_000_013L);
        assertThat(transaction.getGateway()).isEqualTo(PaymentGateway.PAYOS);
        assertThat(transaction.getGatewayOrderCode()).isEqualTo(5_000_013L);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("cancelOnlinePayment: hủy link chỉ release attempt, không đóng băng transaction")
    void cancelOnlinePayment_releasesGatewayAttempt() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(13L)
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_013L)
                .status(TransactionStatus.PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(orderRepositoryPort.save(order)).thenReturn(order);
        doAnswer(invocation -> {
            TransactionModel tx = invocation.getArgument(1);
            tx.releaseGatewayAttempt("Khách hủy link");
            return null;
        }).when(gatewayStrategy).cancelPayment(order, transaction, "Khách hủy link");

        OrderModel result = transactionService.cancelOnlinePayment(orderId, 13L, PaymentGateway.PAYOS, "Khách hủy link");

        assertThat(result).isSameAs(order);
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.CANCELLED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("processPayment: neu nhieu online transaction pending thi bat buoc chon transactionId")
    void processPayment_requiresTransactionSelectionWhenMultiplePendingOnlineTransactionsExist() {
        UUID orderId = UUID.randomUUID();
        TransactionModel first = TransactionModel.builder()
                .id(11L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .build();
        TransactionModel second = TransactionModel.builder()
                .id(12L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.DIRECT)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(first, second))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> transactionService.processPayment(orderId, null, PaymentGateway.PAYOS))
                .isInstanceOf(DomainException.class)
                .hasMessage("Cần chỉ định giao dịch thanh toán.");
    }

    @Test
    @DisplayName("processGatewayCallback: success callback map theo gatewayOrderCode và lưu sold ticket")
    void processGatewayCallback_success_mapsByGatewayOrderCode() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_013L)
                .status(TransactionStatus.PENDING)
                .build();
        OrderDetailModel detail = OrderDetailModel.builder()
                .lotteryTicketSerialId(101L)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .orderDetails(List.of(detail))
                .build();
        GatewayCallbackResult callbackResult = new GatewayCallbackResult(
                true,
                5_000_013L,
                "PAYOS_REF_01",
                "success",
                "00",
                "{\"code\":\"00\"}"
        );

        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback("{payload}")).thenReturn(callbackResult);
        when(orderRepositoryPort.findByGatewayOrderCode(5_000_013L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, "{payload}");

        verify(gatewayStrategy).handleSuccess(order, transaction, callbackResult);
        verify(lotteryTicketServicePort).markSoldForOrder(101L);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("processGatewayCallback: direct order co online transaction chi complete order sau khi thanh toan xong")
    void processGatewayCallback_success_completesDirectOrderAfterOnlinePayment() {
        UUID orderId = UUID.randomUUID();
        TransactionModel offlineTransaction = TransactionModel.builder()
                .type(TransactionType.OFFLINE)
                .amount(BigDecimal.valueOf(4_000))
                .status(TransactionStatus.COMPLETED)
                .build();
        TransactionModel onlineTransaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_099L)
                .amount(BigDecimal.valueOf(6_000))
                .status(TransactionStatus.PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.DIRECT)
                .status(OrderStatus.PENDING_PAYMENT)
                .totalAmount(BigDecimal.valueOf(10_000))
                .transactions(List.of(offlineTransaction, onlineTransaction))
                .build();
        GatewayCallbackResult callbackResult = new GatewayCallbackResult(
                true,
                5_000_099L,
                "PAYOS_REF_99",
                "success",
                "00",
                "{\"code\":\"00\"}"
        );

        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback("{payload}")).thenReturn(callbackResult);
        when(orderRepositoryPort.findByGatewayOrderCode(5_000_099L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);
        doAnswer(invocation -> {
            TransactionModel tx = invocation.getArgument(1);
            tx.markPayOsSuccess("PAYOS_REF_99");
            return null;
        }).when(gatewayStrategy).handleSuccess(order, onlineTransaction, callbackResult);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, "{payload}");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("expirePendingPayments: huy order pending payment qua han va tra ve reservation")
    void expirePendingPayments_cancelsExpiredOrders() {
        TransactionModel transaction = TransactionModel.builder()
                .id(99L)
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.valueOf(10_000))
                .status(TransactionStatus.PENDING)
                .build();
        OrderDetailModel detail = OrderDetailModel.builder()
                .lotteryTicketSerialId(8L)
                .build();
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.DIRECT)
                .status(OrderStatus.PENDING_PAYMENT)
                .totalAmount(BigDecimal.valueOf(10_000))
                .transactions(List.of(transaction))
                .orderDetails(List.of(detail))
                .build();

        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(any())).thenReturn(List.of(orderId));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        int expiredCount = transactionService.expirePendingPayments();

        assertThat(expiredCount).isEqualTo(1);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.CANCELLED);
        verify(lotteryTicketServicePort).releaseReservationForOrder(8L);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("expirePendingPayments: bo qua order dang pending nhung da thu mot phan tien")
    void expirePendingPayments_skipsPartiallyPaidOrders() {
        TransactionModel completedTransaction = TransactionModel.builder()
                .type(TransactionType.OFFLINE)
                .amount(BigDecimal.valueOf(4_000))
                .status(TransactionStatus.COMPLETED)
                .build();
        TransactionModel pendingTransaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.valueOf(6_000))
                .status(TransactionStatus.PENDING)
                .build();
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.DIRECT)
                .status(OrderStatus.PENDING_PAYMENT)
                .totalAmount(BigDecimal.valueOf(10_000))
                .transactions(List.of(completedTransaction, pendingTransaction))
                .build();

        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(any())).thenReturn(List.of(orderId));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        int expiredCount = transactionService.expirePendingPayments();

        assertThat(expiredCount).isZero();
        verify(orderRepositoryPort, never()).save(order);
        verify(lotteryTicketServicePort, never()).releaseReservationForOrder(anyLong());
    }

    @Test
    @DisplayName("handleOnlinePaymentFailure: fail qua 3 lan thi huy transaction va huy order neu chua thu dong nao")
    void handleOnlinePaymentFailure_cancelsTransactionAndOrderAfterMaxAttempts() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(21L)
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_021L)
                .status(TransactionStatus.PENDING)
                .build();
        OrderDetailModel detail = OrderDetailModel.builder()
                .lotteryTicketSerialId(88L)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .orderDetails(List.of(detail))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(orderRepositoryPort.save(order)).thenReturn(order);
        when(paymentAttemptCachePort.incrementFailureAttempt(eq(21L), any())).thenReturn(3L);
        doAnswer(invocation -> {
            TransactionModel tx = invocation.getArgument(1);
            tx.releaseGatewayAttempt("PayOS fail");
            return null;
        }).when(gatewayStrategy).handleFailure(any(), any(), any());

        OrderModel result = transactionService.handleOnlinePaymentFailure(orderId, 21L, PaymentGateway.PAYOS, "PayOS fail");

        assertThat(result).isSameAs(order);
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.CANCELLED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(lotteryTicketServicePort).releaseReservationForOrder(88L);
        verify(paymentAttemptCachePort).clearFailureAttempts(21L);
    }
}
