package com.daiphat.accountservice.application.strategy.email;

import com.daiphat.accountservice.application.port.out.mail.MailPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;

@Component
public class AdminCreateUserStrategy extends AbstractEmailStrategy {

    public AdminCreateUserStrategy(MailPort mailPort,
                                   RateLimiterPort rateLimiterPort,
                                   TemplateEngine templateEngine) {
        super(mailPort, rateLimiterPort, templateEngine);
    }

    @Override
    public EmailType getSupportedType() {
        return EmailType.ADMIN_CREATE_USER;
    }

    @Override
    protected String getSubject(Map<String, Object> data) {
        return "Chào mừng bạn đến với DaiPhat - Tài khoản của bạn đã được tạo";
    }

    @Override
    protected String getTemplatePath() {
        return "emails/admin-create-user";
    }

    @Override
    protected AuthAction getAction() {
        return AuthAction.VERIFY_EMAIL; // Reusing verify email limit for now, or could create a new one
    }
}
