package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.springframework.stereotype.Component;

@Component("OFFLINE")
public class CodPaymentStrategy implements PaymentStrategy {

    @Override
    public PaymentResult createPayment(OrderModel order, TransactionModel transaction) {
        return PaymentResult.builder()
                .type(TransactionType.OFFLINE)
                .paymentRef(transaction.getPaymentRef())
                .checkoutUrl(null)
                .status(transaction.getStatus().name())
                .build();
    }

    @Override
    public void handleSuccess(OrderModel order, TransactionModel transaction, String paymentRef) {
        // COD success is handled explicitly when staff collects cash.
    }

    @Override
    public void handleFailure(OrderModel order, TransactionModel transaction, String reason) {
        transaction.markCancelled(reason);
        order.cancelDirectOrder(reason);
    }
}
