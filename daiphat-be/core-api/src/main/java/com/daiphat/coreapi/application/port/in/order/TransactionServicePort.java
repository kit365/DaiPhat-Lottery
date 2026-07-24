package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.dto.order.PendingPaymentCountdownResult;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.util.List;
import java.util.UUID;

public interface TransactionServicePort {

    PaymentResult processPayment(UUID orderId, Long transactionId, PaymentGateway gateway);

    OrderModel handleOnlinePaymentSuccess(UUID orderId, Long transactionId, PaymentGateway gateway, String paymentRef);

    OrderModel handleOnlinePaymentFailure(UUID orderId, Long transactionId, PaymentGateway gateway, String failureReason);

    OrderModel cancelOnlinePayment(UUID orderId, Long transactionId, PaymentGateway gateway, String reason);

    /**
     * Đồng bộ trạng thái đơn với cổng thanh toán khi webhook chưa cập nhật.
     * Nếu PayOS đã PAID mà đơn vẫn PENDING_PAYMENT thì đánh dấu thanh toán thành công.
     */
    OrderModel syncOnlinePaymentFromGateway(UUID orderId);

    void processGatewayCallback(PaymentGateway gateway, String rawPayload);

    OrderModel collectDirectOrderCash(UUID orderId, UUID operatorId, String note);

    int expirePendingPayments();

    PendingPaymentCountdownResult getPendingPaymentCountdown(UUID orderId);

    List<EnumOptionResponse> getTransactionTypes();

    List<EnumOptionResponse> getTransactionStatuses();
}
