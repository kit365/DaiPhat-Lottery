package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.port.out.mail.MailPort;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;

import java.util.HashMap;
import java.util.Map;

@Component
public class StaffInviteStrategy extends AbstractEmailStrategy {

    private final AuthProperties authProperties;

    public StaffInviteStrategy(
            MailPort mailPort,
            TemplateEngine templateEngine,
            AuthProperties authProperties
    ) {
        super(mailPort, templateEngine);
        this.authProperties = authProperties;
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
    public void process(String recipient, Map<String, Object> data) {
        Map<String, Object> enhancedData = new HashMap<>(data);
        String token = (String) data.get("token");

        if (token != null) {
            String inviteLink = String.format("%s/admin/accept-invite?token=%s",
                    authProperties.getFrontendUrl(),
                    token);
            enhancedData.put("inviteLink", inviteLink);
        }

        super.process(recipient, enhancedData);
    }
}
