package com.daiphat.accountservice.infrastructure.config.exception;

import com.daiphat.accountservice.application.dto.response.ApiResponseDTO;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionAdvice {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiResponseDTO<Void>> handleDomainException(DomainException e) {
        log.error("Domain exception occurred: {}", e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        
        String message = (e.getMessage() != null && !e.getMessage().isBlank() && !e.getMessage().contains(errorCode.name())) 
                         ? e.getMessage() 
                         : errorCode.getMessage();

        ApiResponseDTO<Void> apiResponse = ApiResponseDTO.<Void>builder()
                .isSuccess(false)
                .code(errorCode.getCode())
                .message(message)
                .build();
                
        return new ResponseEntity<>(apiResponse, errorCode.getStatus());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponseDTO<Void>> handleAuthenticationException(AuthenticationException e) {
        log.error("Authentication exception occurred: {}", e.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;
        
        ApiResponseDTO<Void> apiResponse = ApiResponseDTO.<Void>builder()
                .isSuccess(false)
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
                
        return new ResponseEntity<>(apiResponse, errorCode.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponseDTO<Void>> handleValidationException(MethodArgumentNotValidException e) {
        log.error("Validation error occurred");
        String errorMessage = "Dữ liệu không hợp lệ.";
        
        if (e.getBindingResult().hasErrors() && e.getBindingResult().getFieldError() != null) {
            errorMessage = e.getBindingResult().getFieldError().getDefaultMessage();
        }

        ApiResponseDTO<Void> apiResponse = ApiResponseDTO.<Void>builder()
                .isSuccess(false)
                .code(ErrorCode.INVALID_KEY.getCode())
                .message(errorMessage)
                .build();

        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponseDTO<Void>> handleAllExceptions(Exception e) {
        log.error("Unexpected error occurred: ", e);
        
        ApiResponseDTO<Void> apiResponse = ApiResponseDTO.<Void>builder()
                .isSuccess(false)
                .code(ErrorCode.INTERNAL_SERVER_ERROR.getCode())
                .message(ErrorCode.INTERNAL_SERVER_ERROR.getMessage())
                .build();
                
        return new ResponseEntity<>(apiResponse, ErrorCode.INTERNAL_SERVER_ERROR.getStatus());
    }
}
