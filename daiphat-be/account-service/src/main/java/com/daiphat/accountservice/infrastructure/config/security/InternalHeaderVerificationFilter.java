package com.daiphat.accountservice.infrastructure.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class InternalHeaderVerificationFilter extends OncePerRequestFilter {

    @Value("${DAIPHAT_GATEWAY_SECRET:}")
    private String gatewaySecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();

        // Bypass for actuator and swagger/api-docs
        if (requestPath.startsWith("/actuator") 
                || requestPath.startsWith("/swagger-ui") 
                || requestPath.startsWith("/v3/api-docs")) {
            filterChain.doFilter(request, response);
            return;
        }

        // We check if gatewaySecret is configured. If not, we might fail or ignore.
        // Given we enforce it:
        String secretHeader = request.getHeader("X-Gateway-Secret");
        if (gatewaySecret != null && !gatewaySecret.isEmpty() 
                && (secretHeader == null || !secretHeader.equals(gatewaySecret))) {
            log.warn("Blocked request with invalid or missing Gateway Secret to path: {}", requestPath);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("Forbidden: Invalid Gateway Secret");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
