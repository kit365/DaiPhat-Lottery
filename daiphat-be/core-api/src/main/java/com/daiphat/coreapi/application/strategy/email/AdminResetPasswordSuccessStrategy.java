package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.port.out.mail.MailPort;
import com.daiphat.coreapi.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;

@Component
public class AdminResetPasswordSuccessStrategy extends AbstractEmailStrategy {

    public AdminResetPasswordSuccessStrategy(MailPort mailPort, TemplateEngine templateEngine) {
        super(mailPort, templateEngine);
    }

    @Override
    public EmailType getSupportedType() {
        return EmailType.ADMIN_RESET_PASSWORD_SUCCESS;
    }

    @Override
    protected String getSubject(Map<String, Object> data) {
        return "Mật khẩu của bạn đã được đặt lại - DaiPhat";
    }

    @Override
    protected String getTemplatePath() {
        return "emails/admin-reset-password-success";
    }
}
