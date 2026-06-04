package com.daiphat.coreapi.application.service.mail;

import com.daiphat.coreapi.application.port.in.mail.EmailServicePort;
import com.daiphat.coreapi.application.strategy.email.EmailStrategy;
import com.daiphat.coreapi.application.strategy.email.EmailStrategyFactory;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService implements EmailServicePort {

    private final EmailStrategyFactory strategyFactory;
    private final ObjectMapper objectMapper;

    @Override
    public void sendEmail(EmailType type, String recipient, Map<String, Object> data) {
        EmailStrategy strategy = strategyFactory.getStrategy(type);
        log.info("Sending email of type [{}] to: {}", type, recipient);
        strategy.process(recipient, data);
    }

    @Override
    public void sendEmail(EmailType type, String recipient, Object data) {
        try {
            Map<String, Object> map = objectMapper.convertValue(data, new TypeReference<>() {});
            this.sendEmail(type, recipient, map);
        } catch (Exception e) {
            log.error("Failed to convert email context object to map for {}: {}", type, e.getMessage());
            throw new RuntimeException("Invalid email context object", e);
        }
    }
}
