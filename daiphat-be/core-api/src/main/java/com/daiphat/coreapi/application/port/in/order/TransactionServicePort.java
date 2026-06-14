package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.dto.order.PendingPaymentCountdownResult;
import com.daiphat.coreapi.domain.model.enums.order.PaymentGateway;
import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.util.UUID;

public interface TransactionServicePort {

    PaymentResult processPayment(UUID orderId, Long transactionId, PaymentGateway gateway);

    OrderModel handleOnlinePaymentSuccess(UUID orderId, Long transactionId, PaymentGateway gateway, String paymentRef);

    OrderModel handleOnlinePaymentFailure(UUID orderId, Long transactionId, PaymentGateway gateway, String failureReason);

    OrderModel cancelOnlinePayment(UUID orderId, Long transactionId, PaymentGateway gateway, String reason);

    void processGatewayCallback(PaymentGateway gateway, String rawPayload);

    OrderModel collectDirectOrderCash(UUID orderId, UUID operatorId, String note);

    int expirePendingPayments();

    PendingPaymentCountdownResult getPendingPaymentCountdown(UUID orderId);
}
