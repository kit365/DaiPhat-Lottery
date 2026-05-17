package com.daiphat.accountservice.infrastructure.config.exception;

import com.daiphat.accountservice.application.dto.response.base.ApiResponse;
import com.daiphat.accountservice.application.dto.response.base.SafeResponseData;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionAdvice {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiResponse<?>> handleDomainException(DomainException e) {
        ErrorCode errorCode = e.getErrorCode();

        // Log consistent pattern: [CODE] [PUBLIC MESSAGE] - [INTERNAL DETAIL]
        log.error("Domain exception: [{} - {}] - Detail: {}",
                errorCode.getCode(), e.getMessage(),
                e.getInternalMessage() != null ? e.getInternalMessage() : "No additional detail");

        Object safeData = isSafeData(e.getData()) ? e.getData() : null;

        ApiResponse<Object> apiResponse = ApiResponse.builder()
                .isSuccess(false)
                .message(e.getMessage())
                .data(safeData)
                .build();

        return new ResponseEntity<>(apiResponse, errorCode.getStatus());
    }

    private boolean isSafeData(Object data) {
        if (data == null) {
            return true;
        }
        return data instanceof String
                || data instanceof Number
                || data instanceof Boolean
                || data instanceof SafeResponseData;
    }

    @ExceptionHandler({ AccessDeniedException.class, AuthorizationDeniedException.class })
    public ResponseEntity<ApiResponse<?>> handleAccessDeniedException(Exception e) {
        log.error("Access denied: {}", e.getMessage());
        ErrorCode errorCode = ErrorCode.ACCESS_DENIED;

        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .isSuccess(false)
                .message(errorCode.getMessage())
                .build();

        return new ResponseEntity<>(apiResponse, errorCode.getStatus());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<?>> handleAuthenticationException(AuthenticationException e) {
        log.error("Authentication exception occurred: {}", e.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .isSuccess(false)
                .message(errorCode.getMessage())
                .build();

        return new ResponseEntity<>(apiResponse, errorCode.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidationException(MethodArgumentNotValidException e) {
        log.error("Validation error occurred");
        String errorMessage = "Dữ liệu không hợp lệ.";

        if (e.getBindingResult().hasErrors() && e.getBindingResult().getFieldError() != null) {
            errorMessage = e.getBindingResult().getFieldError().getDefaultMessage();
        }

        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .isSuccess(false)
                .message(errorMessage)
                .build();

        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<?>> handleDataIntegrityViolationException(DataIntegrityViolationException e) {
        log.error("Data integrity violation: {}", e.getMessage());

        // Generic 'Invalid Input' for all integrity violations at the advice level
        ErrorCode errorCode = ErrorCode.INVALID_INPUT;

        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .isSuccess(false)
                .message(errorCode.getMessage())
                .build();

        return new ResponseEntity<>(apiResponse, errorCode.getStatus());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleAllExceptions(Exception e) {
        log.error("Unexpected error occurred: ", e);

        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .isSuccess(false)
                .message(ErrorCode.INTERNAL_SERVER_ERROR.getMessage())
                .build();

        return new ResponseEntity<>(apiResponse, ErrorCode.INTERNAL_SERVER_ERROR.getStatus());
    }
}
