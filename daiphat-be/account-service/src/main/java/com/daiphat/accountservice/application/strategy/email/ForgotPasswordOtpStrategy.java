package com.daiphat.accountservice.application.strategy.email;

import com.daiphat.accountservice.application.port.out.MailPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;


@Component
public class ForgotPasswordOtpStrategy extends AbstractEmailStrategy {

    public ForgotPasswordOtpStrategy(MailPort mailPort,
                                   RateLimiterPort rateLimiterPort,
                                   TemplateEngine templateEngine) {
        super(mailPort, rateLimiterPort, templateEngine);
    }

    @Override
    public EmailType getSupportedType() {
        return EmailType.FORGOT_PW_OTP;
    }

    @Override
    protected String getSubject(Map<String, Object> data) {
        return "Mã xác thực khôi phục mật khẩu - DaiPhat";
    }

    @Override
    protected String getTemplatePath() {
        return "emails/forgot-password";
    }

    @Override
    protected AuthAction getAction() {
        return AuthAction.FORGOT_PASSWORD;
    }
}
