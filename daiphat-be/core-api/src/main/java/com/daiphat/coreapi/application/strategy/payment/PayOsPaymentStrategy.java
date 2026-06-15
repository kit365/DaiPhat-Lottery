package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentLinkResult;
import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.port.out.order.PayOsGatewayPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("ONLINE")
@RequiredArgsConstructor
public class PayOsPaymentStrategy implements PaymentGatewayStrategy {

    private final PayOsGatewayPort payOsGatewayPort;

    @Override
    public PaymentGateway getGateway() {
        return PaymentGateway.PAYOS;
    }

    @Override
    public PaymentResult createPayment(OrderModel order, TransactionModel transaction) {
        transaction.setGateway(PaymentGateway.PAYOS);
        PaymentLinkResult paymentLink = payOsGatewayPort.createOrReusePaymentLink(order, transaction);
        return new PaymentResult(
                transaction.getId(),
                TransactionType.ONLINE,
                PaymentGateway.PAYOS,
                paymentLink.gatewayOrderCode(),
                transaction.getPaymentRef(),
                paymentLink.checkoutUrl(),
                transaction.getStatus().name()
        );
    }

    @Override
    public void cancelPayment(OrderModel order, TransactionModel transaction, String reason) {
        if (!payOsGatewayPort.cancelPaymentLink(transaction.getGatewayOrderCode())) {
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to cancel PayOS payment link.");
        }
        transaction.releaseGatewayAttempt(reason);
    }

    @Override
    public GatewayCallbackResult parseCallback(String rawPayload) {
        return payOsGatewayPort.parseCallback(rawPayload);
    }

    @Override
    public void handleSuccess(OrderModel order, TransactionModel transaction, GatewayCallbackResult callbackResult) {
        transaction.markPayOsSuccess(callbackResult.paymentRef());
        if (order.getOrderType() == OrderType.ONLINE) {
            order.markPaid();
        }
    }

    @Override
    public void handleFailure(OrderModel order, TransactionModel transaction, GatewayCallbackResult callbackResult) {
        transaction.releaseGatewayAttempt(callbackResult.message());
    }
}
