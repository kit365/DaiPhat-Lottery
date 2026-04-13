package com.daiphat.accountservice.infrastructure.config.security;

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

        if (username != null && rolesString != null) {
            log.trace("Trusting Gateway identity: {}, ROLES: {}", username, rolesString);

            List<SimpleGrantedAuthority> authorities = Arrays.stream(rolesString.split(","))
                    .filter(role -> !role.isEmpty())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());

            // Create Authentication object (principal is the username)
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    authorities
            );

            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("Internal Authentication established for: {} (ID: {})", username, userId != null ? userId : "N/A");
        }

        filterChain.doFilter(request, response);
    }
}
