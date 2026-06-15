package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.springframework.stereotype.Component;

@Component("OFFLINE")
public class CodPaymentStrategy implements PaymentStrategy {

    @Override
    public PaymentResult createPayment(OrderModel order, TransactionModel transaction) {
        return new PaymentResult(
                transaction.getId(),
                TransactionType.OFFLINE,
                null,
                transaction.getGatewayOrderCode(),
                transaction.getPaymentRef(),
                null,
                transaction.getStatus().name()
        );
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
