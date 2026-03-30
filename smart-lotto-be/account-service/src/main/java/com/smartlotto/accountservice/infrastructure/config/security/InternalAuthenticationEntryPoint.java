package com.smartlotto.accountservice.infrastructure.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlotto.accountservice.application.dto.response.ApiResponseDTO;
import com.smartlotto.accountservice.domain.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Custom entry point to return a standardized ApiResponseDTO when authentication fails.
 * This prevents Spring Security from returning a raw 401 status or default HTML error page.
 */
@Component
@RequiredArgsConstructor
public class InternalAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull AuthenticationException authException)
            throws IOException {
        
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ApiResponseDTO<Void> apiResponse = ApiResponseDTO.<Void>builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .isSuccess(false)
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        response.flushBuffer();
    }
}
