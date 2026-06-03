package com.daiphat.coreapi.domain.exception;
import com.daiphat.coreapi.domain.model.enums.EmailType;
import lombok.Getter;

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
