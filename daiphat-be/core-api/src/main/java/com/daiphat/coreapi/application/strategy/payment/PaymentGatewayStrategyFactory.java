package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class PaymentGatewayStrategyFactory {

    private final Map<PaymentGateway, PaymentGatewayStrategy> strategies;

    public PaymentGatewayStrategyFactory(List<PaymentGatewayStrategy> strategies) {
        this.strategies = strategies.stream()
                .collect(Collectors.toUnmodifiableMap(PaymentGatewayStrategy::getGateway, Function.identity()));
    }

    public PaymentGatewayStrategy getStrategy(PaymentGateway gateway) {
        PaymentGatewayStrategy strategy = strategies.get(gateway);
        if (strategy == null) {
            throw new DomainException(ErrorCode.UNSUPPORTED_PAYMENT_TYPE);
        }
        return strategy;
    }
}
