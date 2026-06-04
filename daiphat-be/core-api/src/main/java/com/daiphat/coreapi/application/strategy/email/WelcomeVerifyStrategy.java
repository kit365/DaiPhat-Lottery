package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.port.out.mail.MailPort;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.HashMap;
import java.util.Map;

@Component
public class WelcomeVerifyStrategy extends AbstractEmailStrategy {

    private final AuthProperties authProperties;

    public WelcomeVerifyStrategy(
            MailPort mailPort,
            TemplateEngine templateEngine,
            AuthProperties authProperties
    ) {
        super(mailPort, templateEngine);
        this.authProperties = authProperties;
    }

    @Override
    public EmailType getSupportedType() {
        return EmailType.WELCOME_VERIFY;
    }

    @Override
    protected String getSubject(Map<String, Object> data) {
        return "Chào mừng bạn đến với DaiPhat - Xác thực tài khoản của bạn";
    }

    @Override
    protected String getTemplatePath() {
        return "emails/verify-email";
    }

    @Override
    public void process(String recipient, Map<String, Object> data) {
        Map<String, Object> enhancedData = new HashMap<>(data);
        String token = (String) data.get("token");

        if (token != null) {
            String verifyLink = String.format("%s%s%s",
                    authProperties.getFrontendUrl(),
                    authProperties.getVerificationPaths().getClientPath(),
                    token);
            enhancedData.put("verifyLink", verifyLink);
        }

        super.process(recipient, enhancedData);
    }
}
