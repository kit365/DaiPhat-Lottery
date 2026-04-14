package com.daiphat.accountservice.infrastructure.config.security;

import com.daiphat.accountservice.domain.model.enums.UserRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Filter that trusts internal identification headers propagated by the API Gateway.
 * It reconstructs the SecurityContext without verifying JWT locally.
 */
@Slf4j
public class InternalAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String userId = request.getHeader("X-Internal-User-Id");
        String username = request.getHeader("X-Internal-User-Name");
        String rolesString = request.getHeader("X-Internal-User-Roles");

        if (userId != null && username != null && rolesString != null) {
            log.trace("Trusting Gateway identity: {}, ROLES: {}", username, rolesString);

            List<SimpleGrantedAuthority> authorities = Arrays.stream(rolesString.split(","))
                    .filter(role -> !role.isEmpty())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());

            // DP-32 Middleware: Reject MEMBER roles for admin-protected services
            boolean isRestrictedRole = authorities.stream()
                    .anyMatch(a -> a.getAuthority().equals(UserRole.MEMBER.getCode()));

            String path = request.getRequestURI();
            boolean isPublicPath = path.contains("/api/v1/auth/") || 
                                 path.contains("/error") || 
                                 path.contains("/actuator") || 
                                 path.contains("/api-docs") || 
                                 path.contains("/swagger-ui");

            if (isRestrictedRole && !isPublicPath) {
                log.warn("Blocked restricted role access to {}: {} (Role: {})", path, username, rolesString);
                // We don't throw exception here to avoid breaking the filter chain abruptly, 
                // but we don't set the Authentication, leading to 401/403 in SecurityConfig
                // OR we can throw if we want immediate 403
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied for this role");
                return;
            }

            // Create Authentication object (principal is the username)
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    authorities
            );

            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("Internal Authentication established for: {} (ID: {})", username, userId);
        }

        filterChain.doFilter(request, response);
    }
}
