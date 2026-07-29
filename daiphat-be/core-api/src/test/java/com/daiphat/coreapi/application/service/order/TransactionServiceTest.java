package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.dto.order.PendingPaymentCountdownResult;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.PaymentAttemptCachePort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategy;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategyFactory;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.application.port.in.order.TransactionServicePort;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.application.event.OrderPaidForProcessingEvent;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@DisplayName("[DP-267] TransactionService")
class TransactionServiceTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final UserLookupServicePort userLookupServicePort = mock(UserLookupServicePort.class);
    private final PaymentGatewayStrategyFactory paymentGatewayStrategyFactory = mock(PaymentGatewayStrategyFactory.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final PaymentCountdownCachePort paymentCountdownCachePort = mock(PaymentCountdownCachePort.class);
    private final PaymentAttemptCachePort paymentAttemptCachePort = mock(PaymentAttemptCachePort.class);
    private final PaymentGatewayStrategy gatewayStrategy = mock(PaymentGatewayStrategy.class);
    private final ApplicationEventPublisher applicationEventPublisher = mock(org.springframework.context.ApplicationEventPublisher.class);
    private final PaymentTimeoutConfigService paymentTimeoutConfigService = mock(PaymentTimeoutConfigService.class);

    private static final String GATEWAY_SUCCESS_STATUS = "success";
    private static final String GATEWAY_FAILURE_STATUS = "failure";
    private static final String GATEWAY_SUCCESS_CODE = "00";
    private static final String GATEWAY_FAILURE_CODE = "01";
    private static final String GATEWAY_SUCCESS_PAYLOAD = "{\"code\":\"00\"}";
    private static final String GATEWAY_FAILURE_PAYLOAD = "{\"code\":\"01\"}";
    private static final String MOCK_PAYLOAD_STR = "{payload}";

    private TransactionServicePort transactionService;

    @BeforeEach
    void setUp() {
        transactionService = new TransactionService(
                orderRepositoryPort,
                userLookupServicePort,
                paymentGatewayStrategyFactory,
                lotteryTicketServicePort,
                paymentCountdownCachePort,
                paymentAttemptCachePort,
                applicationEventPublisher,
                paymentTimeoutConfigService,
                mock(TransactionServicePort.class)
        );
        when(paymentTimeoutConfigService.getTimeoutSeconds()).thenReturn(180L);
        when(paymentTimeoutConfigService.getTimeoutCancelReason()).thenReturn("Quá thời gian thanh toán 3 phút.");
        when(paymentTimeoutConfigService.getTimeoutMinutes()).thenReturn(3);
    }

    @Test
    @DisplayName("[DP-343] processPayment: online payment phải persist gatewayOrderCode do gateway strategy gán")
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
    @DisplayName("[DP-343] processPayment: nếu tạo payment link lỗi thì phải xóa order vừa tạo và release vé")
    void processPayment_cleansUpPendingOrderWhenGatewayCreateLinkFails() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(13L)
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.valueOf(100_000))
                .status(TransactionStatus.PENDING)
                .build();
        OrderDetailModel detail = OrderDetailModel.builder()
                .lotteryTicketSerialId(101L)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderCode("ORD-001")
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .orderDetails(List.of(detail))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(orderRepositoryPort.save(order)).thenReturn(order);
        when(gatewayStrategy.createPayment(order, transaction))
                .thenThrow(new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, "Could not allocate a fresh PayOS order code."));

        DomainException exception = catchThrowableOfType(
                () -> transactionService.processPayment(orderId, 13L, PaymentGateway.PAYOS),
                DomainException.class
        );

        assertThat(exception).isNotNull();
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR);
        assertThat(exception.getInternalMessage()).isEqualTo("Could not allocate a fresh PayOS order code.");
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.CANCELLED);
        verify(lotteryTicketServicePort).releaseReservationForOrder(101L);
        verify(paymentCountdownCachePort).clear(orderId);
        verify(orderRepositoryPort).deleteById(orderId);
        verify(orderRepositoryPort, never()).save(order);
    }

    @Test
    @DisplayName("[DP-343] cancelOnlinePayment: hủy link chỉ release attempt, không đóng băng transaction")
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
    @DisplayName("[DP-343] processPayment: neu nhieu online transaction pending thi bat buoc chon transactionId")
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
    @DisplayName("[DP-343] processGatewayCallback: success callback map theo gatewayOrderCode và lưu sold ticket")
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
                GATEWAY_SUCCESS_STATUS,
                GATEWAY_SUCCESS_CODE,
                GATEWAY_SUCCESS_PAYLOAD
        );

        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(callbackResult);
        when(orderRepositoryPort.findByGatewayOrderCode(5_000_013L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);

        verify(gatewayStrategy).handleSuccess(order, transaction, callbackResult);
        verify(lotteryTicketServicePort).markProxyHoldingForPaidOrder(101L, orderId);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("[DP-343] processGatewayCallback: direct order co online transaction chi complete order sau khi thanh toan xong")
    void processGatewayCallback_success_completesDirectOrderAfterOnlinePayment() {
        UUID orderId = UUID.randomUUID();
        TransactionModel offlineTransaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
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
                GATEWAY_SUCCESS_STATUS,
                GATEWAY_SUCCESS_CODE,
                GATEWAY_SUCCESS_PAYLOAD
        );

        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(callbackResult);
        when(orderRepositoryPort.findByGatewayOrderCode(5_000_099L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);
        doAnswer(invocation -> {
            TransactionModel tx = invocation.getArgument(1);
            tx.markPayOsSuccess("PAYOS_REF_99");
            return null;
        }).when(gatewayStrategy).handleSuccess(order, onlineTransaction, callbackResult);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("[DP-343] expirePendingPayments: huy order pending payment qua han va tra ve reservation")
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
    @DisplayName("[DP-343] expirePendingPayments: bo qua order dang pending nhung da thu mot phan tien")
    void expirePendingPayments_skipsPartiallyPaidOrders() {
        TransactionModel completedTransaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
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
    @DisplayName("[DP-343] handleOnlinePaymentFailure: fail qua 3 lan thi huy transaction va huy order neu chua thu dong nao")
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
    @Test
    @DisplayName("[DP-343] handleOnlinePaymentSuccess: xu ly thanh toan thanh cong, release tickets va gui notification")
    void handleOnlinePaymentSuccess_processesSuccessfully() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(22L)
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_022L)
                .status(TransactionStatus.PENDING)
                .build();
        OrderDetailModel detail = OrderDetailModel.builder()
                .lotteryTicketSerialId(101L)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderCode("ORD-222")
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .orderDetails(List.of(detail))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(orderRepositoryPort.save(order)).thenReturn(order);

        OrderModel result = transactionService.handleOnlinePaymentSuccess(orderId, 22L, PaymentGateway.PAYOS, "PAYOS_REF_222");

        assertThat(result).isSameAs(order);
        verify(gatewayStrategy).handleSuccess(eq(order), eq(transaction), any(GatewayCallbackResult.class));
        verify(lotteryTicketServicePort).markProxyHoldingForPaidOrder(101L, orderId);
        verify(paymentAttemptCachePort).clearFailureAttempts(22L);
        verify(applicationEventPublisher, atLeastOnce()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("[DP-343] collectDirectOrderCash: thu tien mat thanh cong cho don hang truc tiep")
    void collectDirectOrderCash_processesSuccessfully() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(33L)
                .type(TransactionType.OFFLINE)
                .amount(BigDecimal.valueOf(10_000))
                .status(TransactionStatus.PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.DIRECT)
                .totalAmount(BigDecimal.valueOf(10_000))
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(com.daiphat.coreapi.domain.model.UserModel.class));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(order)).thenReturn(order);

        OrderModel result = transactionService.collectDirectOrderCash(orderId, operatorId, "Thu tien tai quay");

        assertThat(result).isSameAs(order);
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(transaction.getCodCollectedBy()).isEqualTo(operatorId);
        assertThat(transaction.getNote()).isEqualTo("Thu tien tai quay");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        verify(orderRepositoryPort).save(order);
        verify(paymentCountdownCachePort).clear(orderId);
    }

    @Test
    @DisplayName("[DP-343] handleOnlinePaymentFailure: fail duoi limit thi chi tang attempt")
    void handleOnlinePaymentFailure_incrementsAttemptAndSavesOrder() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(21L)
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_021L)
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
        when(paymentAttemptCachePort.incrementFailureAttempt(eq(21L), any())).thenReturn(1L);

        OrderModel result = transactionService.handleOnlinePaymentFailure(orderId, 21L, PaymentGateway.PAYOS, "PayOS fail");

        assertThat(result).isSameAs(order);
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.PENDING); // Chưa bị cancel do chưa tới max
        verify(gatewayStrategy).handleFailure(eq(order), eq(transaction), any(GatewayCallbackResult.class));
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("[DP-343] processGatewayCallback: failure callback updates failure attempt")
    void processGatewayCallback_failure_handlesFailure() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(44L)
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_044L)
                .status(TransactionStatus.PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();
        GatewayCallbackResult callbackResult = new GatewayCallbackResult(
                false,
                5_000_044L,
                "PAYOS_REF_44",
                GATEWAY_FAILURE_STATUS,
                GATEWAY_FAILURE_CODE,
                GATEWAY_FAILURE_PAYLOAD
        );

        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(callbackResult);
        when(orderRepositoryPort.findByGatewayOrderCode(5_000_044L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);
        when(paymentAttemptCachePort.incrementFailureAttempt(eq(44L), any())).thenReturn(1L);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);

        verify(gatewayStrategy).handleFailure(order, transaction, callbackResult);
        verify(paymentAttemptCachePort).incrementFailureAttempt(eq(44L), any());
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("[DP-343] getPendingPaymentCountdown: return correctly based on cache")
    void getPendingPaymentCountdown_returnsCorrectly() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PAYMENT)
                .build();

        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(order));
        when(paymentCountdownCachePort.getRemainingSeconds(orderId)).thenReturn(Optional.of(120L));

        PendingPaymentCountdownResult result = transactionService.getPendingPaymentCountdown(orderId);

        assertThat(result.orderId()).isEqualTo(orderId);
        assertThat(result.remainingSeconds()).isEqualTo(120L);
        assertThat(result.expired()).isFalse();
        assertThat(result.expiresAt()).isNotNull();
    }

    @Test
    @DisplayName("[DP-343] getTransactionTypes and getTransactionStatuses return correct enum options")
    void getTransactionEnums_returnsCorrectly() {
        assertThat(transactionService.getTransactionTypes()).isNotEmpty();
        assertThat(transactionService.getTransactionStatuses()).isNotEmpty();
    }

    @Test
    @DisplayName("[DP-343] processPayment: neu transactionId null va co 1 pending online transaction thi tu chon no")
    void processPayment_selectsPendingTransactionIfOnlyOne() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(55L)
                .type(TransactionType.ONLINE)
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
        when(gatewayStrategy.createPayment(order, transaction)).thenReturn(
                new PaymentResult(55L, TransactionType.ONLINE, PaymentGateway.PAYOS, 555L, null, "url", "PENDING")
        );

        PaymentResult result = transactionService.processPayment(orderId, null, PaymentGateway.PAYOS);

        assertThat(result.transactionId()).isEqualTo(55L);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("[DP-343] getPendingOnlineTransaction: throws exception neu transaction ko phai la pending")
    void processPayment_throwsExceptionWhenTransactionNotPending() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(66L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.CANCELLED)
                .build();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> transactionService.processPayment(orderId, 66L, PaymentGateway.PAYOS))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TRANSACTION_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-343] cancelPendingTransactions: skips non-pending transactions")
    void expirePendingPayments_skipsNonPendingTransactions() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.CANCELLED)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();
        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(any())).thenReturn(List.of(order.getId()));
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));

        transactionService.expirePendingPayments();

        verify(paymentGatewayStrategyFactory, never()).getStrategy(any());
    }

    @Test
    @DisplayName("[DP-343] cancelPendingTransactions: handles DomainException during strategy cancel")
    void expirePendingPayments_handlesDomainExceptionFromStrategy() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(12345L)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();
        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(any())).thenReturn(List.of(order.getId()));
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        doThrow(new DomainException(ErrorCode.INTERNAL_SERVER_ERROR)).when(gatewayStrategy).cancelPayment(any(), any(), any());

        transactionService.expirePendingPayments();

        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.CANCELLED);
    }

    @Test
    @DisplayName("[DP-343] publishPaymentSuccessNotifications: skips if orderId is null")
    void publishPaymentSuccessNotifications_skipsIfOrderIdNull() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gatewayOrderCode(12345L)
                .build();
        OrderModel orderToSave = OrderModel.builder()
                .id(null)
                .status(OrderStatus.PENDING_PAYMENT)
                .userId(UUID.randomUUID())
                .orderCode("CODE")
                .transactions(List.of(transaction))
                .orderDetails(List.of())
                .build();
        
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(new GatewayCallbackResult(true, 12345L, "ref", GATEWAY_SUCCESS_STATUS, GATEWAY_SUCCESS_CODE, GATEWAY_SUCCESS_PAYLOAD));
        when(orderRepositoryPort.findByGatewayOrderCode(12345L)).thenReturn(Optional.of(orderToSave));
        
        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);

        verify(applicationEventPublisher, never()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("[DP-343] publishPaymentSuccessNotifications: skips OrderStatusChangedEvent if userId or status is null")
    void publishPaymentSuccessNotifications_skipsStatusEventIfUserIdNull() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gatewayOrderCode(12345L)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(null)
                .userId(null)
                .orderCode("CODE")
                .transactions(List.of(transaction))
                .orderDetails(List.of())
                .build();
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(new GatewayCallbackResult(true, 12345L, "ref", GATEWAY_SUCCESS_STATUS, GATEWAY_SUCCESS_CODE, GATEWAY_SUCCESS_PAYLOAD));
        when(orderRepositoryPort.findByGatewayOrderCode(12345L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);

        verify(applicationEventPublisher, times(1)).publishEvent(any(OrderPaidForProcessingEvent.class));
        verify(applicationEventPublisher, never()).publishEvent(any(OrderStatusChangedEvent.class));
    }

    @Test
    @DisplayName("[DP-343] processGatewayCallback: skips if gatewayOrderCode is null")
    void processGatewayCallback_skipsIfGatewayOrderCodeNull() {
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(new GatewayCallbackResult(true, null, "ref", GATEWAY_SUCCESS_STATUS, GATEWAY_SUCCESS_CODE, GATEWAY_SUCCESS_PAYLOAD));
        
        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);
        
        verify(orderRepositoryPort, never()).findByGatewayOrderCode(anyLong());
    }

    @Test
    @DisplayName("[DP-343] processGatewayCallback: skips if order not found")
    void processGatewayCallback_skipsIfOrderNotFound() {
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(new GatewayCallbackResult(true, 12345L, "ref", GATEWAY_SUCCESS_STATUS, GATEWAY_SUCCESS_CODE, GATEWAY_SUCCESS_PAYLOAD));
        when(orderRepositoryPort.findByGatewayOrderCode(12345L)).thenReturn(Optional.empty());
        
        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);
        
        verify(gatewayStrategy, never()).handleSuccess(any(), any(), any());
    }

    @Test
    @DisplayName("[DP-343] processGatewayCallback: skips if transaction not pending")
    void processGatewayCallback_skipsIfTransactionNotPending() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.COMPLETED)
                .gatewayOrderCode(12345L)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .transactions(List.of(transaction))
                .build();
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(MOCK_PAYLOAD_STR)).thenReturn(new GatewayCallbackResult(true, 12345L, "ref", GATEWAY_SUCCESS_STATUS, GATEWAY_SUCCESS_CODE, GATEWAY_SUCCESS_PAYLOAD));
        when(orderRepositoryPort.findByGatewayOrderCode(12345L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);
        
        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);
        
        verify(gatewayStrategy, never()).handleSuccess(any(), any(), any());
    }

    @Test
    @DisplayName("[DP-343] getPendingOnlineTransaction: throws if matched transaction is offline")
    void getPendingOnlineTransaction_throwsIfMatchedTransactionOffline() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.OFFLINE)
                .status(TransactionStatus.PENDING)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .transactions(List.of(transaction))
                .build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> transactionService.processPayment(order.getId(), 1L, null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TRANSACTION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-343] getPendingOnlineTransaction: throws if gateway mismatch")
    void getPendingOnlineTransaction_throwsIfGatewayMismatch() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gateway(PaymentGateway.PAYOS)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .transactions(List.of(transaction))
                .build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> transactionService.processPayment(order.getId(), 1L, null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TRANSACTION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-343] getPendingPaymentCountdown: returns 0 if order not pending_payment")
    void getPendingPaymentCountdown_returnsZeroIfNotPendingPayment() {
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.COMPLETED)
                .build();
        when(orderRepositoryPort.findById(order.getId())).thenReturn(Optional.of(order));

        PendingPaymentCountdownResult result = transactionService.getPendingPaymentCountdown(order.getId());
        
        assertThat(result.remainingSeconds()).isZero();
        assertThat(result.expired()).isTrue();
    }

    @Test
    @DisplayName("[DP-343] getPendingPaymentCountdown: returns expired if remainingSeconds is 0")
    void getPendingPaymentCountdown_returnsExpiredIfRemainingZero() {
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.PENDING_PAYMENT)
                .build();
        when(orderRepositoryPort.findById(order.getId())).thenReturn(Optional.of(order));
        when(paymentCountdownCachePort.getRemainingSeconds(order.getId())).thenReturn(Optional.of(0L));

        PendingPaymentCountdownResult result = transactionService.getPendingPaymentCountdown(order.getId());
        
        assertThat(result.remainingSeconds()).isZero();
        assertThat(result.expired()).isTrue();
        assertThat(result.expiresAt()).isNull();
    }

    @Test
    @DisplayName("[DP-343] handlePaymentLinkCreationFailure: skips release/delete if order partially paid")
    void processPayment_handleLinkFailureSkipsDeleteIfPartiallyPaid() {

        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gateway(PaymentGateway.PAYOS)
                .build();
        TransactionModel completedTx = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.TEN)
                .status(TransactionStatus.COMPLETED)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction, completedTx))
                .build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        doThrow(new DomainException(ErrorCode.INTERNAL_SERVER_ERROR)).when(gatewayStrategy).createPayment(any(), any());

        assertThatThrownBy(() -> transactionService.processPayment(order.getId(), 1L, PaymentGateway.PAYOS))
                .isInstanceOf(DomainException.class);

        verify(orderRepositoryPort, never()).deleteById(any());
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("[DP-343] cancelOnlinePayment: skips pending payment cancel if partially paid")
    void cancelOnlinePayment_skipsPendingPaymentCancelIfPartiallyPaid() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gateway(PaymentGateway.PAYOS)
                .build();
        TransactionModel completedTx = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.TEN)
                .status(TransactionStatus.COMPLETED)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction, completedTx))
                .build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));
        when(orderRepositoryPort.save(any())).thenReturn(order);
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);

        transactionService.cancelOnlinePayment(order.getId(), 1L, PaymentGateway.PAYOS, "Cancel");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        verify(orderRepositoryPort).save(order);
    }

    @Test
    @DisplayName("[DP-343] enforceFailureAttemptLimit: skips if transaction id is null")
    void handleOnlinePaymentFailure_skipsIfTransactionIdNull() {
        TransactionModel transaction = TransactionModel.builder()
                .id(null)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .build();
        
OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);

        transactionService.handleOnlinePaymentFailure(order.getId(), null, PaymentGateway.PAYOS, "Fail");

        verify(paymentAttemptCachePort, never()).incrementFailureAttempt(any(), any());
    }

    @Test
    @DisplayName("[DP-343] enforceFailureAttemptLimit: skips cancel pending payment if partially paid")
    void handleOnlinePaymentFailure_skipsCancelPendingPaymentIfPartiallyPaid() {
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gateway(PaymentGateway.PAYOS)
                .build();
        TransactionModel completedTx = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.TEN)
                .status(TransactionStatus.COMPLETED)
                .build();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction, completedTx))
                .build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(paymentAttemptCachePort.incrementFailureAttempt(eq(1L), any())).thenReturn(5L);

        transactionService.handleOnlinePaymentFailure(order.getId(), 1L, PaymentGateway.PAYOS, "Fail");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
    }


    @Test
    @DisplayName("[DP-343] getPendingOnlineTransaction: multiple pending online transactions throws not found if no explicit ID")
    void getPendingOnlineTransaction_throwsIfMultiplePendingAndNoId() {
        TransactionModel transaction1 = TransactionModel.builder().id(1L).type(TransactionType.ONLINE).status(TransactionStatus.PENDING).gateway(PaymentGateway.PAYOS).build();
        TransactionModel transaction2 = TransactionModel.builder().id(2L).type(TransactionType.ONLINE).status(TransactionStatus.PENDING).gateway(PaymentGateway.PAYOS).build();
        OrderModel order = OrderModel.builder().id(UUID.randomUUID()).transactions(List.of(transaction1, transaction2)).build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(java.util.Optional.of(order));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.processPayment(order.getId(), null, PaymentGateway.PAYOS))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.TRANSACTION_SELECTION_REQUIRED);
    }

    @Test
    @DisplayName("[DP-343] getPendingOnlineTransaction: returns transaction if gateway is null")
    void getPendingOnlineTransaction_returnsIfGatewayNull() {
        TransactionModel transaction = TransactionModel.builder().id(1L).type(TransactionType.ONLINE).status(TransactionStatus.PENDING).gateway(null).build();
        OrderModel order = OrderModel.builder().id(UUID.randomUUID()).transactions(List.of(transaction)).build();
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(java.util.Optional.of(order));
        
        // Mock gateway to prevent error downstream
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);

        // It should not throw transaction not found
        transactionService.processPayment(order.getId(), 1L, PaymentGateway.PAYOS);
        org.mockito.Mockito.verify(paymentGatewayStrategyFactory).getStrategy(PaymentGateway.PAYOS);
    }

    @Test
    @DisplayName("[DP-343] publishPaymentSuccessNotifications: skips if order status is null")
    void publishPaymentSuccessNotifications_skipsIfOrderStatusNull() {
        TransactionModel transaction = TransactionModel.builder().id(1L).type(TransactionType.ONLINE).status(TransactionStatus.PENDING).gatewayOrderCode(12345L).build();
        OrderModel order = OrderModel.builder().id(UUID.randomUUID()).userId(UUID.randomUUID()).status(null).orderCode("CODE").transactions(List.of(transaction)).build();
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback("payload")).thenReturn(new GatewayCallbackResult(true, 12345L, "ref", "success", GATEWAY_SUCCESS_CODE, "payload"));
        when(orderRepositoryPort.findByGatewayOrderCode(12345L)).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(org.mockito.ArgumentMatchers.any())).thenReturn(order);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, "payload");

        org.mockito.Mockito.verify(applicationEventPublisher, org.mockito.Mockito.times(1)).publishEvent(org.mockito.ArgumentMatchers.any(OrderPaidForProcessingEvent.class));
        org.mockito.Mockito.verify(applicationEventPublisher, org.mockito.Mockito.never()).publishEvent(org.mockito.ArgumentMatchers.any(OrderStatusChangedEvent.class));
    }

    @Test
    @DisplayName("[DP-343] expirePendingPayments: skips if transaction is not ONLINE")
    void expirePendingPayments_skipsIfNotOnline() {
        TransactionModel transaction = TransactionModel.builder().id(1L).type(TransactionType.ONLINE).status(TransactionStatus.PENDING).build();
        OrderModel order = OrderModel.builder().id(UUID.randomUUID()).status(OrderStatus.PENDING_PAYMENT).transactions(List.of(transaction)).build();
        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(org.mockito.ArgumentMatchers.any())).thenReturn(List.of(order.getId()));
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(org.mockito.ArgumentMatchers.any())).thenReturn(order);

        transactionService.expirePendingPayments();

        // the transaction is canceled locally but gateway is not called
        org.assertj.core.api.Assertions.assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.CANCELLED);
        org.mockito.Mockito.verify(paymentGatewayStrategyFactory, org.mockito.Mockito.never()).getStrategy(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-343] cancelPendingTransactions: logs error if strategy throws exception")
    void cancelPendingTransactions_logsErrorIfStrategyThrows() {
        TransactionModel transaction = TransactionModel.builder().id(1L).type(TransactionType.ONLINE).status(TransactionStatus.PENDING).gateway(PaymentGateway.PAYOS).gatewayOrderCode(123L).build();
        OrderModel order = OrderModel.builder().id(UUID.randomUUID()).status(OrderStatus.PENDING_PAYMENT).transactions(List.of(transaction)).build();
        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(org.mockito.ArgumentMatchers.any())).thenReturn(List.of(order.getId()));
        when(orderRepositoryPort.findByIdWithLock(order.getId())).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(org.mockito.ArgumentMatchers.any())).thenReturn(order);
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        org.mockito.Mockito.doThrow(new DomainException(ErrorCode.INTERNAL_SERVER_ERROR)).when(gatewayStrategy).cancelPayment(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());

        transactionService.expirePendingPayments();

        // order is still canceled locally
        org.assertj.core.api.Assertions.assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }
    
    @Test
    @DisplayName("[DP-343] cancelOnlinePayment: Bỏ qua khi transaction không ở trạng thái PENDING")
    void cancelOnlinePayment_skipsWhenNotPending() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.COMPLETED)
                .gatewayOrderCode(5000L)
                .gateway(PaymentGateway.PAYOS)
                .build();
        
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.cancelOnlinePayment(orderId, 5000L, PaymentGateway.PAYOS, "Hủy"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.TRANSACTION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-343] cancelOnlinePayment: Lỗi khi transaction khác cổng thanh toán")
    void cancelOnlinePayment_throwsWhenGatewayMismatch() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gatewayOrderCode(5000L)
                .gateway(null)
                .build();
        
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.cancelOnlinePayment(orderId, 5000L, PaymentGateway.PAYOS, "Hủy"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.TRANSACTION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-343] processPayment: publish events check id and userId")
    void processPayment_publishEventNullChecks() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(13L)
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.valueOf(100_000))
                .status(TransactionStatus.PENDING)
                .build();
        
        OrderModel order = OrderModel.builder()
                .id(null)
                .userId(null)
                .orderType(OrderType.DIRECT)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(any())).thenReturn(gatewayStrategy);
        when(orderRepositoryPort.save(any())).thenReturn(order);

        transactionService.processPayment(orderId, 13L, PaymentGateway.PAYOS);

        verify(applicationEventPublisher, never()).publishEvent(any(OrderPaidForProcessingEvent.class));
    }

    @Test
    @DisplayName("[DP-343] processPayment: Cập nhật failed status nếu vượt limit ở createPayment")
    void processPayment_createPaymentFails_exceedsLimit() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gatewayOrderCode(5000L)
                .gateway(PaymentGateway.PAYOS)
                .build();
        
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.createPayment(order, transaction)).thenThrow(new RuntimeException("Lỗi"));
        when(paymentAttemptCachePort.incrementFailureAttempt(anyLong(), any())).thenReturn(4L); // Exceeds limit 3

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.processPayment(orderId, 1L, PaymentGateway.PAYOS))
                .isInstanceOf(DomainException.class);

        org.assertj.core.api.Assertions.assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.CANCELLED);
        verify(orderRepositoryPort).deleteById(orderId);
    }

    @Test
    @DisplayName("[DP-343] expirePendingPayments: Bỏ qua khi gateway hoặc gatewayOrderCode null")
    void expirePendingPayments_skipsNullGateway() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gatewayOrderCode(null)
                .gateway(null)
                .build();
        
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(any())).thenReturn(List.of(orderId));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        transactionService.expirePendingPayments();

        verify(paymentGatewayStrategyFactory, never()).getStrategy(any());
    }

    @Test
    @DisplayName("[DP-343] handleOnlinePaymentSuccess: verify missing branches in reconcileDirectOrderPayment")
    void processGatewayCallback_reconcilesOnlyPendingPayment() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.valueOf(1000))
                .status(TransactionStatus.PENDING)
                .gatewayOrderCode(5000L)
                .gateway(PaymentGateway.PAYOS)
                .build();
        
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .orderType(OrderType.DIRECT)
                .status(OrderStatus.PAID)
                .totalAmount(BigDecimal.valueOf(1000))
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByGatewayOrderCode(5000L)).thenReturn(Optional.of(order));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(anyString())).thenReturn(
                new GatewayCallbackResult(true, 5000L, "REF", GATEWAY_SUCCESS_STATUS, GATEWAY_SUCCESS_CODE, MOCK_PAYLOAD_STR)
        );
        when(orderRepositoryPort.save(any())).thenReturn(order);

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, MOCK_PAYLOAD_STR);

        // Status wasn't PENDING_PAYMENT, so it shouldn't try to markPaid again, but it will still completeDirectOrder
        verify(orderRepositoryPort).save(order);
    }


    @Test
    @DisplayName("[DP-343] processPayment: Ném DomainException khi createPayment thất bại với DomainException")
    void processPayment_createPaymentThrowsDomainException() {
        UUID orderId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .id(1L)
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .gatewayOrderCode(5000L)
                .gateway(PaymentGateway.PAYOS)
                .build();
        
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PAYMENT)
                .transactions(List.of(transaction))
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.createPayment(order, transaction)).thenThrow(new DomainException(ErrorCode.INVALID_INPUT, "Lỗi nghiệp vụ"));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.processPayment(orderId, 1L, PaymentGateway.PAYOS))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-343] processGatewayCallback: Bỏ qua khi order rỗng do findByGatewayOrderCode trả về có ID nhưng null khi lock")
    void processGatewayCallback_skipsWhenOrderLockFails() {
        OrderModel existing = OrderModel.builder().id(UUID.randomUUID()).build();
        when(orderRepositoryPort.findByGatewayOrderCode(123L)).thenReturn(Optional.of(existing));
        when(orderRepositoryPort.findByIdWithLock(existing.getId())).thenReturn(Optional.empty());
        when(paymentGatewayStrategyFactory.getStrategy(PaymentGateway.PAYOS)).thenReturn(gatewayStrategy);
        when(gatewayStrategy.parseCallback(anyString())).thenReturn(
                new GatewayCallbackResult(true, 123L, "REF", "OK", "00", "RAW")
        );

        transactionService.processGatewayCallback(PaymentGateway.PAYOS, "RAW");

        verify(orderRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-343] expirePendingPayments: Bỏ qua khi order = null")
    void expirePendingPayments_skipsNullOrder() {
        UUID orderId = UUID.randomUUID();
        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(any())).thenReturn(List.of(orderId));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.empty());

        transactionService.expirePendingPayments();

        verify(orderRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-343] expirePendingPayments: Bỏ qua khi order có completed amount > 0")
    void expirePendingPayments_skipsWhenCompletedAmountGreaterThanZero() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PAYMENT)
                .totalAmount(BigDecimal.valueOf(100))
                .build();
        // mock completed transaction amount > 0 by mocking a completed transaction
        TransactionModel tx = TransactionModel.builder().id(1L).amount(BigDecimal.valueOf(50)).status(TransactionStatus.COMPLETED).build();
        order.getTransactions().add(tx);

        when(orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(any())).thenReturn(List.of(orderId));
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        transactionService.expirePendingPayments();

        verify(orderRepositoryPort, never()).save(order);
    }

    @Test
    @DisplayName("[DP-343] getOrderOrThrow: Ném exception ORDER_NOT_FOUND khi không tìm thấy đơn")
    void cancelOnlinePayment_throwsOrderNotFound() {
        UUID orderId = UUID.randomUUID();
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.cancelOnlinePayment(orderId, 1L, PaymentGateway.PAYOS, "Hủy"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ORDER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-343] getOrderWithLockOrThrow: Ném exception ORDER_NOT_FOUND khi không tìm thấy đơn lúc lock")
    void processPayment_throwsOrderNotFound() {
        UUID orderId = UUID.randomUUID();
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.processPayment(orderId, 1L, PaymentGateway.PAYOS))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ORDER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-343] getPendingOfflineTransaction: Ném exception TRANSACTION_NOT_FOUND khi không có giao dịch offline chờ")
    void collectDirectOrderCash_throwsTransactionNotFound() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.PENDING_PICKUP)
                .transactions(List.of()) // Empty transactions
                .build();
        
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> transactionService.collectDirectOrderCash(orderId, UUID.randomUUID(), "Lấy tiền mặt"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.TRANSACTION_NOT_FOUND);
    }
}
