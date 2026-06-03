package com.daiphat.coreapi.infrastructure.config.exception;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionAdvice {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiResponse<?>> handleDomainException(DomainException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        log.error("Domain exception: [{} - {}] - Detail: {}",
                errorCode.getCode(),
                exception.getMessage(),
                exception.getInternalMessage() != null ? exception.getInternalMessage() : "No additional detail");

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(exception.getMessage(), exception.getData()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidationException(MethodArgumentNotValidException exception) {
        String message = "Dữ liệu không hợp lệ.";
        if (exception.getBindingResult().hasErrors() && exception.getBindingResult().getFieldError() != null) {
            message = exception.getBindingResult().getFieldError().getDefaultMessage();
        }

        return ResponseEntity.badRequest().body(ApiResponse.error(message));
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResponse<?>> handleAccessDeniedException(Exception exception) {
        log.error("Access denied: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.ACCESS_DENIED;

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<?>> handleAuthenticationException(AuthenticationException exception) {
        log.error("Authentication exception: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<?>> handleDataIntegrityViolationException(
            DataIntegrityViolationException exception
    ) {
        log.error("Data integrity violation: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.INVALID_INPUT;

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleAllExceptions(Exception exception) {
        log.error("Unexpected error occurred: ", exception);
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
    }
}
