package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.util.UUID;

public interface TransactionServicePort {

    PaymentResult processPayment(UUID orderId, TransactionType type);

    OrderModel handleOnlinePaymentSuccess(UUID orderId, String paymentRef);

    OrderModel handleOnlinePaymentFailure(UUID orderId, String failureReason);

    OrderModel collectDirectOrderCash(UUID orderId, UUID operatorId, String note);
}
