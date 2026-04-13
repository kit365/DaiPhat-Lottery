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
    private final long waitTime;

    public EmailRateLimitException(String recipient, EmailType emailType, long waitTimeSeconds) {
        super(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(waitTimeSeconds));
        this.recipient = recipient;
        this.emailType = emailType;
        this.waitTime = waitTimeSeconds;
    }
}
