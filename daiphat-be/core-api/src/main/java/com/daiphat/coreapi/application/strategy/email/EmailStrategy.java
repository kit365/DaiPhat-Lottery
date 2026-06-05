package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import java.util.Map;

public interface EmailStrategy {
    EmailType getSupportedType();
    void process(String to, Map<String, Object> parameters);
}
