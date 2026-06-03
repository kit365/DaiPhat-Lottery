package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class EmailStrategyFactory {

    private final Map<EmailType, EmailStrategy> strategyMap = new ConcurrentHashMap<>();

    public EmailStrategyFactory(List<EmailStrategy> strategies) {
        strategies.forEach(strategy -> strategyMap.put(strategy.getSupportedType(), strategy));
    }

    public EmailStrategy getStrategy(EmailType type) {
        EmailStrategy strategy = strategyMap.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("No email strategy registered for type: " + type);
        }
        return strategy;
    }
}
