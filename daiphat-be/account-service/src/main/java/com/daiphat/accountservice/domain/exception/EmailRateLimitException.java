package com.daiphat.accountservice.domain.exception;

import com.daiphat.accountservice.domain.model.enums.EmailType;
import lombok.Getter;

/**
 * Exception khi bị chặn bởi Rate Limiting.
 */
@Getter
public class EmailRateLimitException extends DomainException {
    private final String recipient;
    private final EmailType emailType;

    public EmailRateLimitException(String recipient, EmailType emailType, String message) {
        super(ErrorCode.TOO_MANY_REQUESTS, message);
        this.recipient = recipient;
        this.emailType = emailType;
    }
}
