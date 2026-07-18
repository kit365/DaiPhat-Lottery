package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import org.mapstruct.factory.Mappers;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategyFactory;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService customer refund eligibility")
class OrderServiceCustomerRefundTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort = mock(LotteryTicketSerialServicePort.class);
    private final UserLookupServicePort userLookupServicePort = mock(UserLookupServicePort.class);
    private final PaymentCountdownCachePort paymentCountdownCachePort = mock(PaymentCountdownCachePort.class);
    private final PaymentGatewayStrategyFactory paymentGatewayStrategyFactory = mock(PaymentGatewayStrategyFactory.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final TransactionRepositoryPort transactionRepositoryPort = mock(TransactionRepositoryPort.class);
    private final PaymentTimeoutConfigService paymentTimeoutConfigService = mock(PaymentTimeoutConfigService.class);

    private OrderServicePort orderService;
    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        OrderRefundGraceService orderRefundGraceService = new OrderRefundGraceService(
                systemConfigRepositoryPort,
                refundRequestRepositoryPort,
                transactionRepositoryPort);

        orderService = new OrderService(
                orderRepositoryPort,
                lotteryTicketServicePort,
                lotteryTicketSerialServicePort,
                userLookupServicePort,
                Mappers.getMapper(OrderApplicationMapper.class),
                paymentCountdownCachePort,
                paymentGatewayStrategyFactory,
                eventPublisher,
                orderRefundGraceService,
                paymentTimeoutConfigService);

        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("30").build()));
        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(UserModel.builder().id(customerId).build());
    }

    @Test
    @DisplayName("getMyOrders: paid preparing order exposes refundEligible when payment time is within grace")
    void getMyOrders_exposesRefundEligibleForPaidPreparingOrder() {
        LocalDateTime paidAt = LocalDateTime.now().minusMinutes(5);
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .userId(customerId)
                .orderCode("SAMPLE-ORD-PAID")
                .orderType(OrderType.ONLINE)
                .receiveType(OrderReceiveType.COUNTER_PICKUP)
                .status(OrderStatus.PREPARING)
                .totalAmount(BigDecimal.valueOf(10000))
                .transactions(List.of())
                .createdAt(LocalDateTime.now().minusMinutes(30))
                .build();

        when(orderRepositoryPort.findMyOrders(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 10), 1));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(transactionRepositoryPort.findLatestPaymentSuccessAt(orderId)).thenReturn(Optional.of(paidAt));

        var response = orderService.getMyOrders(1, 10, List.of(), null, null, List.of(), null, "createdAt", "DESC", customerId);

        OrderResponse orderResponse = response.getRecordList().getFirst();
        assertThat(orderResponse.refundEligible()).isTrue();
        assertThat(orderResponse.refundRemainingSeconds()).isPositive();
        assertThat(orderResponse.refundPaymentSuccessAt()).isEqualTo(paidAt);
    }
}
