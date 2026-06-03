package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.port.out.mail.MailPort;
import com.daiphat.coreapi.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;

@Component
public class ForgotPasswordOtpStrategy extends AbstractEmailStrategy {

    public ForgotPasswordOtpStrategy(MailPort mailPort, TemplateEngine templateEngine) {
        super(mailPort, templateEngine);
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
}
