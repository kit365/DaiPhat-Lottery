package com.daiphat.accountservice.application.port.in.mail;

import com.daiphat.accountservice.application.dto.event.EmailTask;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import java.util.Map;

public interface EmailServicePort {
    void sendEmail(EmailType type, String recipient, Map<String, Object> data);

    void sendAsync(EmailType type, String recipient, Map<String, Object> data);

    void processAsyncEmail(EmailTask task);
}
