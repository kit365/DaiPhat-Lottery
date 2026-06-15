package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentLinkResult;
import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.port.out.order.PayOsGatewayPort;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("PayOsPaymentStrategy")
class PayOsPaymentStrategyTest {

    private final PayOsGatewayPort payOsGatewayPort = mock(PayOsGatewayPort.class);
    private final PayOsPaymentStrategy strategy = new PayOsPaymentStrategy(payOsGatewayPort);

    @Test
    @DisplayName("createPayment: gán gateway PayOS và trả checkoutUrl")
    void createPayment_returnsCheckoutDataFromGateway() {
        OrderModel order = OrderModel.builder()
                .orderCode("ORD-TEST01")
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .build();
        TransactionModel transaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .amount(BigDecimal.valueOf(120_000))
                .status(TransactionStatus.PENDING)
                .build();

        when(payOsGatewayPort.createOrReusePaymentLink(order, transaction))
                .thenAnswer(invocation -> {
                    transaction.setGatewayOrderCode(5_000_013L);
                    return new PaymentLinkResult(5_000_013L, "https://pay.payos.vn/web/abc");
                });

        PaymentResult result = strategy.createPayment(order, transaction);

        assertThat(result.transactionId()).isNull();
        assertThat(result.gateway()).isEqualTo(PaymentGateway.PAYOS);
        assertThat(result.gatewayOrderCode()).isEqualTo(5_000_013L);
        assertThat(result.checkoutUrl()).isEqualTo("https://pay.payos.vn/web/abc");
        assertThat(transaction.getGateway()).isEqualTo(PaymentGateway.PAYOS);
        assertThat(transaction.getGatewayOrderCode()).isEqualTo(5_000_013L);
    }

    @Test
    @DisplayName("handleSuccess: đánh dấu transaction completed và order paid")
    void handleSuccess_marksTransactionAndOrderPaid() {
        OrderModel order = OrderModel.builder()
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .build();
        TransactionModel transaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .status(TransactionStatus.PENDING)
                .build();
        GatewayCallbackResult callbackResult = new GatewayCallbackResult(
                true,
                5_000_013L,
                "PAYOS_TXN_01",
                "success",
                "00",
                "{}"
        );

        strategy.handleSuccess(order, transaction, callbackResult);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(transaction.getPaymentRef()).isEqualTo("PAYOS_TXN_01");
    }

    @Test
    @DisplayName("handleFailure: release attempt để order có thể thanh toán lại")
    void handleFailure_releasesGatewayAttempt() {
        OrderModel order = OrderModel.builder()
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PAYMENT)
                .build();
        TransactionModel transaction = TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .gateway(PaymentGateway.PAYOS)
                .gatewayOrderCode(5_000_013L)
                .status(TransactionStatus.PENDING)
                .build();
        GatewayCallbackResult callbackResult = new GatewayCallbackResult(
                false,
                5_000_013L,
                null,
                "cancelled",
                "CANCELLED",
                "{}"
        );

        strategy.handleFailure(order, transaction, callbackResult);

        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.PENDING);
        assertThat(transaction.getGatewayOrderCode()).isNull();
        assertThat(transaction.getFailureReason()).isEqualTo("cancelled");
    }
}
