package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentLinkResult;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;

public interface PayOsGatewayPort {

    PaymentLinkResult createOrReusePaymentLink(OrderModel order, TransactionModel transaction);

    boolean cancelPaymentLink(Long gatewayOrderCode);

    /**
     * Kiểm tra trạng thái thanh toán thực tế trên PayOS (PAID).
     */
    boolean isPaymentPaid(Long gatewayOrderCode);

    GatewayCallbackResult parseCallback(String rawPayload);
}
