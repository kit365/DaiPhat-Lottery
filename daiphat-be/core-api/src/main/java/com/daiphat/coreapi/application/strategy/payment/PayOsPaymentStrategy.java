package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.springframework.stereotype.Component;

@Component("ONLINE")
public class PayOsPaymentStrategy implements PaymentStrategy {

    @Override
    public PaymentResult createPayment(OrderModel order, TransactionModel transaction) {
        return PaymentResult.builder()
                .type(TransactionType.ONLINE)
                .paymentRef(transaction.getPaymentRef())
                .checkoutUrl(null)
                .status(transaction.getStatus().name())
                .build();
    }

    @Override
    public void handleSuccess(OrderModel order, TransactionModel transaction, String paymentRef) {
        transaction.markPayOsSuccess(paymentRef);
        order.markPaid();
    }

    @Override
    public void handleFailure(OrderModel order, TransactionModel transaction, String reason) {
        transaction.markPayOsFailed(reason);
    }
}
