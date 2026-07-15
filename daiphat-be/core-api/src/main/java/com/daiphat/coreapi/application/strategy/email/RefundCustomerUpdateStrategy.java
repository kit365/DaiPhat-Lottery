package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.port.out.mail.MailPort;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import org.springframework.stereotype.Component;
import org.thymeleaf.ITemplateEngine;

import java.util.Map;

@Component
public class RefundCustomerUpdateStrategy extends AbstractEmailStrategy {

    public RefundCustomerUpdateStrategy(MailPort mailPort, ITemplateEngine templateEngine) {
        super(mailPort, templateEngine);
    }

    @Override
    public EmailType getSupportedType() {
        return EmailType.REFUND_CUSTOMER_UPDATE;
    }

    @Override
    protected String getSubject(Map<String, Object> data) {
        Object title = data.get("title");
        if (title != null && !title.toString().isBlank()) {
            return "[DaiPhat] " + title;
        }
        return "[DaiPhat] Thông báo yêu cầu hoàn tiền";
    }

    @Override
    protected String getTemplatePath() {
        return "emails/refund-customer-update";
    }
}
