package com.daiphat.accountservice.application.strategy.email;

import com.daiphat.accountservice.application.port.out.mail.MailPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;

@Component
public class AdminResetPasswordOtpStrategy extends AbstractEmailStrategy {

    public AdminResetPasswordOtpStrategy(MailPort mailPort,
                                         RateLimiterPort rateLimiterPort,
                                         TemplateEngine templateEngine) {
        super(mailPort, rateLimiterPort, templateEngine);
    }

    @Override
    public EmailType getSupportedType() {
        return EmailType.ADMIN_RESET_PASSWORD_OTP;
    }

    @Override
    protected String getSubject(Map<String, Object> data) {
        return "Mã xác thực yêu cầu đặt lại mật khẩu - DaiPhat";
    }

    @Override
    protected String getTemplatePath() {
        return "emails/admin-reset-password-otp";
    }

    @Override
    protected AuthAction getAction() {
        return AuthAction.FORGOT_PASSWORD; // Reuse rate limit action
    }
}
