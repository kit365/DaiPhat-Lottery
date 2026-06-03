package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.port.out.mail.MailPort;
import com.daiphat.coreapi.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;

@Component
public class AdminCreateUserStrategy extends AbstractEmailStrategy {

    public AdminCreateUserStrategy(MailPort mailPort, TemplateEngine templateEngine) {
        super(mailPort, templateEngine);
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
}
