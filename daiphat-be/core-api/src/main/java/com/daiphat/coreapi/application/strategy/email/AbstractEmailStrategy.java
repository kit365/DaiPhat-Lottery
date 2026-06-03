package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.port.out.mail.MailPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Slf4j
@RequiredArgsConstructor
public abstract class AbstractEmailStrategy implements EmailStrategy {
    protected final MailPort mailPort;
    protected final TemplateEngine templateEngine;

    protected abstract String getSubject(Map<String, Object> data);

    protected abstract String getTemplatePath();

    @Override
    public void process(String recipient, Map<String, Object> data) {
        try {
            log.info("Executing email strategy: {} for recipient: {}", getSupportedType(), recipient);

            // 1. Render Template
            Context context = new Context();
            context.setVariables(data);
            String content = templateEngine.process(getTemplatePath(), context);

            // 2. Gửi Mail trực tiếp qua MailPort
            mailPort.sendMail(recipient, getSubject(data), content, true);

            log.info("Successfully sent email [{}] to {}", getSupportedType(), recipient);
        } catch (Exception e) {
            log.error("Failed to execute email strategy {}: {}", getSupportedType(), e.getMessage());
            throw new RuntimeException("Email delivery failed", e);
        }
    }
}
