package com.daiphat.accountservice.infrastructure.config.security;

import com.daiphat.accountservice.application.port.out.RoleRepositoryPort;
import com.daiphat.accountservice.domain.model.enums.UserRole;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
        String rolesString = request.getHeader("X-Internal-User-Roles");

        if (userId != null && username != null && rolesString != null) {
            log.trace("Trusting Gateway identity: {}, ROLES: {}", username, rolesString);

            List<String> roleCodes = Arrays.stream(rolesString.split(","))
                    .filter(role -> !role.isEmpty())
                    .toList();

            List<SimpleGrantedAuthority> authorities = new ArrayList<>(roleCodes.stream()
                    .map(SimpleGrantedAuthority::new)
                    .toList());

            // Augment with permissions from DB (Distributed RBAC hardening)
            try {
                Set<String> permissionCodes = roleRepositoryPort.findPermissionCodesByRoleCodes(roleCodes);
                authorities.addAll(permissionCodes.stream()
                        .map(SimpleGrantedAuthority::new)
                        .toList());
                log.trace("Augmented authorities for {}: {}", username, authorities);
            } catch (Exception e) {
                log.error("Failed to augment permissions for {}: {}", username, e.getMessage());
            }

            // DP-32 Middleware: Reject ONLY-MEMBER access for admin-protected services
            boolean hasMemberRole = authorities.stream()
                    .anyMatch(a -> a.getAuthority().equals(UserRole.MEMBER.getCode()));
            boolean hasPrivilegedRole = authorities.stream()
                    .anyMatch(a -> !a.getAuthority().equals(UserRole.MEMBER.getCode()));

            String path = request.getRequestURI();
            boolean isPublicPath = path.contains("/api/v1/auth/") ||
                    path.contains("/api/v1/users/me") ||
                    path.contains("/error") ||
                    path.contains("/actuator") ||
                    path.contains("/api-docs") ||
                    path.contains("/swagger-ui");

            if (hasMemberRole && !hasPrivilegedRole && !isPublicPath) {
                log.warn("Blocked restricted role access to {}: {} (Role: {})", path, username, rolesString);
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied for this role");
                return;
            }

            // Create Authentication object (principal is the username)
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    authorities);

            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("Internal Authentication established for: {} (ID: {}) with {} authorities", 
                    username, userId, authorities.size());
        }

        filterChain.doFilter(request, response);
    }
}
