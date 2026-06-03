package com.daiphat.coreapi.domain.exception;

import lombok.Getter;

@Getter
public class EmailDispatchException extends DomainException {
    public EmailDispatchException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public EmailDispatchException(ErrorCode errorCode, Throwable cause) {
        super(errorCode, cause);
    }
}
