package com.smartlotto.accountservice.infrastructure.config.exception;

import com.smartlotto.accountservice.application.dto.response.ApiResponseDTO;
import com.smartlotto.accountservice.domain.exception.DomainException;
import com.smartlotto.accountservice.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionAdvice {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiResponseDTO<Void>> handleDomainException(DomainException e) {
        log.error("Domain exception occurred: {}", e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        
        ApiResponseDTO<Void> apiResponse = ApiResponseDTO.<Void>builder()
                .isSuccess(false)
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
                
        return new ResponseEntity<>(apiResponse, errorCode.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponseDTO<Map<String, String>>> handleValidationException(MethodArgumentNotValidException e) {
        log.error("Validation error occurred");
        Map<String, String> details = new HashMap<>();
        e.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            details.put(fieldName, errorMessage);
        });

        ApiResponseDTO<Map<String, String>> apiResponse = ApiResponseDTO.<Map<String, String>>builder()
                .isSuccess(false)
                .code(ErrorCode.INVALID_KEY.getCode())
                .message("Dữ liệu không hợp lệ.")
                .data(details)
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
