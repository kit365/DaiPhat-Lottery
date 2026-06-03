package com.daiphat.coreapi.application.port.in.mail;

import com.daiphat.coreapi.domain.model.enums.EmailType;
import java.util.Map;

public interface EmailServicePort {
    void sendEmail(EmailType type, String recipient, Map<String, Object> data);
    void sendEmail(EmailType type, String recipient, Object data);
}
