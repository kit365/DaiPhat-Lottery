package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;

public interface PaymentGatewayStrategy {

    PaymentGateway getGateway();

    PaymentResult createPayment(OrderModel order, TransactionModel transaction);

    void cancelPayment(OrderModel order, TransactionModel transaction, String reason);

    GatewayCallbackResult parseCallback(String rawPayload);

    void handleSuccess(OrderModel order, TransactionModel transaction, GatewayCallbackResult callbackResult);

    void handleFailure(OrderModel order, TransactionModel transaction, GatewayCallbackResult callbackResult);
}
