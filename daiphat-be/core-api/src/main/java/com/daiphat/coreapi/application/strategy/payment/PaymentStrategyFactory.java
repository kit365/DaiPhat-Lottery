package com.daiphat.coreapi.application.strategy.payment;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class PaymentStrategyFactory {

    private final Map<String, PaymentStrategy> strategies;

    public PaymentStrategyFactory(Map<String, PaymentStrategy> strategies) {
        this.strategies = strategies;
    }

    public PaymentStrategy getStrategy(TransactionType type) {
        PaymentStrategy strategy = strategies.get(type.name());
        if (strategy == null) {
            throw new DomainException(ErrorCode.UNSUPPORTED_PAYMENT_TYPE);
        }
        return strategy;
    }
}
