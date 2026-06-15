package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;

public interface PaymentStrategy {

    PaymentResult createPayment(OrderModel order, TransactionModel transaction);

    void handleSuccess(OrderModel order, TransactionModel transaction, String paymentRef);

    void handleFailure(OrderModel order, TransactionModel transaction, String reason);
}
