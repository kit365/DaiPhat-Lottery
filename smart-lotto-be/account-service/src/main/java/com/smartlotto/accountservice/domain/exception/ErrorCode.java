package com.smartlotto.accountservice.domain.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // Auth Errors
    INVALID_CREDENTIALS("AUTH_001", "Tài khoản hoặc mật khẩu không chính xác.", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED("AUTH_002", "Bạn không có quyền truy cập tài nguyên này.", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED("AUTH_003", "Token đã hết hạn.", HttpStatus.UNAUTHORIZED),
    
    // User Errors
    USER_NOT_FOUND("USR_001", "Người dùng không tồn tại.", HttpStatus.NOT_FOUND),
    USER_EXISTED("USR_002", "Người dùng đã tồn tại trong hệ thống.", HttpStatus.BAD_REQUEST),
    ROLE_NOT_FOUND("USR_003", "Hệ thống chưa cấu hình Role phù hợp.", HttpStatus.NOT_FOUND),
    
    // System Errors
    UNCATEGORIZED_EXCEPTION("SYS_001", "Lỗi chưa được phân loại.", HttpStatus.INTERNAL_SERVER_ERROR),
    INTERNAL_SERVER_ERROR("SYS_002", "Hệ thống đang bận, vui lòng thử lại sau.", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY("SYS_003", "Mã lỗi không hợp lệ.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus status;

    ErrorCode(String code, String message, HttpStatus status) {
        this.code = code;
        this.message = message;
        this.status = status;
    }
}
