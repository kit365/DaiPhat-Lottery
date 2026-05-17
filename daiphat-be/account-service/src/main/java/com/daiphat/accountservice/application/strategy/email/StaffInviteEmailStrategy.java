package com.daiphat.accountservice.application.strategy.email;

import com.daiphat.accountservice.application.port.out.mail.MailPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.Map;

@Component
public class StaffInviteEmailStrategy extends AbstractEmailStrategy {

    public StaffInviteEmailStrategy(MailPort mailPort,
                                    RateLimiterPort rateLimiterPort,
                                    TemplateEngine templateEngine) {
        super(mailPort, rateLimiterPort, templateEngine);
    }

    @Override
    public EmailType getSupportedType() {
        return EmailType.STAFF_INVITE;
    }

    @Override
    protected String getSubject(Map<String, Object> data) {
        return "Lời mời trở thành Nhân viên - Nền tảng DaiPhat";
    }

    @Override
    protected String getTemplatePath() {
        return "emails/staff-invite";
    }

    @Override
    protected AuthAction getAction() {
        return AuthAction.STAFF_INVITE;
    }
}
