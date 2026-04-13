package com.daiphat.accountservice.application.strategy.email;

import com.daiphat.accountservice.application.port.out.MailPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;


@Component
public class WelcomeVerifyStrategy extends AbstractEmailStrategy {

    public WelcomeVerifyStrategy(MailPort mailPort,
                                RateLimiterPort rateLimiterPort,
                                TemplateEngine templateEngine) {
        super(mailPort, rateLimiterPort, templateEngine);
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
    protected AuthAction getAction() {
        return AuthAction.VERIFY_EMAIL;
    }
}
