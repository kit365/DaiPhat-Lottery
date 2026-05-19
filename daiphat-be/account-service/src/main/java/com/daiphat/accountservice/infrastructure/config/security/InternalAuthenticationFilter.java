package com.daiphat.accountservice.infrastructure.config.security;

import com.daiphat.accountservice.application.port.out.auth.RoleRepositoryPort;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Filter that trusts internal identification headers propagated by the API Gateway.
 * It reconstructs the SecurityContext without verifying JWT locally.
 * This filter also augments the authentication with permissions from the database.
 */
@Slf4j
@RequiredArgsConstructor
public class InternalAuthenticationFilter extends OncePerRequestFilter {

    private final RoleRepositoryPort roleRepositoryPort;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String userId = request.getHeader("X-Internal-User-Id");
        String username = request.getHeader("X-Internal-User-Name");
        String email = request.getHeader("X-Internal-User-Email");
        String firstNameRaw = request.getHeader("X-Internal-User-First-Name");
        String lastNameRaw = request.getHeader("X-Internal-User-Last-Name");
        String avatarRaw = request.getHeader("X-Internal-User-Avatar");
        String rolesString = request.getHeader("X-Internal-User-Roles");

        String firstName = decode(firstNameRaw);
        String lastName = decode(lastNameRaw);
        String avatarUrl = decode(avatarRaw);
        
        log.info("--- BACKEND IDENTITY ---");
        log.info("User: {} ({}), Email: {}, Name: {} {}, Avatar: {}", 
                username, userId, email, firstName, lastName, avatarUrl != null ? "PRESENT" : "NONE");
        log.info("------------------------");

        if (userId != null && username != null) {
            List<String> roleCodes = (rolesString == null || rolesString.isBlank()) 
                    ? new ArrayList<>() 
                    : Arrays.stream(rolesString.split(",")).filter(r -> !r.isEmpty()).toList();

            List<SimpleGrantedAuthority> authorities = new ArrayList<>(roleCodes.stream()
                    .map(SimpleGrantedAuthority::new)
                    .toList());

            // Augment with permissions from DB
            Set<String> permissionCodes = roleRepositoryPort.findPermissionCodesByRoleCodes(roleCodes);
            authorities.addAll(permissionCodes.stream()
                    .map(SimpleGrantedAuthority::new)
                    .toList());

            log.debug("User {} authenticated with roles {} and permissions {}", 
                    username, roleCodes, permissionCodes);

            // Create Authentication object (principal is the SecurityUser)
            SecurityUser principal = new SecurityUser(
                    UUID.fromString(userId),
                    username,
                    email,
                    firstName,
                    lastName,
                    avatarUrl
            );

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    authorities);

            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("Internal context established: {} with {} authorities", username, authorities.size());
        }

        filterChain.doFilter(request, response);
    }

    private String decode(String value) {
        if (value == null) return null;
        try {
            return java.net.URLDecoder.decode(value, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Failed to decode value: {}", value);
            return value;
        }
    }
}
