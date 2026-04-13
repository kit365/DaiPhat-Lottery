package com.daiphat.accountservice.domain.exception;

import lombok.Getter;

@Getter
public class DomainException extends RuntimeException {
    private final ErrorCode errorCode;
    private final Object data;
    private final String internalMessage;

    public DomainException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.data = null;
        this.internalMessage = null;
    }

    public DomainException(ErrorCode errorCode, Object data, Object... args) {
        super(formatMessage(errorCode.getMessage(), args));
        this.errorCode = errorCode;
        this.data = data;
        this.internalMessage = null;
    }

    private static String formatMessage(String message, Object... args) {
        if (args == null || args.length == 0 || message == null || !message.contains("%")) {
            return message;
        }
        try {
            return String.format(message, args);
        } catch (Exception e) {
            // Fallback to raw message if formatting fails (prevents crash)
            return message;
        }
    }

    /**
     * Constructor for errors with internal technical details.
     * The provided message is treated as internal-only (for logging), 
     * while the user-facing message is derived from the ErrorCode.
     */
    public DomainException(ErrorCode errorCode, String internalMessage) {
        super(errorCode.getMessage()); // Public message is safe
        this.errorCode = errorCode;
        this.internalMessage = internalMessage; // Store for internal logging
        this.data = null;
    }

    public DomainException(ErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
        this.internalMessage = cause != null ? cause.getMessage() : null;
        this.data = null;
    }

    public DomainException(ErrorCode errorCode, Object data, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
        this.data = data;
        this.internalMessage = cause != null ? cause.getMessage() : null;
    }
}
