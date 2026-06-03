package com.daiphat.coreapi.infrastructure.security.jwt;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.TokenProviderPort;
import com.daiphat.coreapi.domain.model.UserModel;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AUTH = ApiConstants.API_V1 + "/auth";

    private final TokenProviderPort tokenProviderPort;
    private final UserLookupServicePort userLookupService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals(AUTH + "/login")
                || path.equals(AUTH + "/google")
                || path.equals(AUTH + "/refresh-token")
                || path.equals(AUTH + "/logout")
                || path.equals(AUTH + "/register")
                || path.equals(AUTH + "/register/resend-verification")
                || path.equals(AUTH + "/verify-email")
                || path.equals(AUTH + "/password-policy")
                || path.startsWith(AUTH + "/forgot-password")
                || path.equals("/api/v1/users/accept-invite")
                || path.equals("/actuator/health")
                || path.equals("/actuator/info")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/webjars");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader(AUTHORIZATION);

        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        try {
            String username = tokenProviderPort.extractUsernameFromAccessToken(token);
            UserModel user = userLookupService.findByUsername(username)
                    .orElseThrow(() -> new NoSuchElementException("Token user not found"));
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    user,
                    null,
                    authorities(user)
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (JwtException | IllegalArgumentException | NoSuchElementException ex) {
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
        }
    }

    private List<SimpleGrantedAuthority> authorities(UserModel user) {
        if (user.getRole() == null || user.getRole().getCode() == null || user.getRole().getCode().isBlank()) {
            return List.of();
        }
        
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(user.getRole().getCode()));
        
        if (user.getRole().getPermissions() != null) {
            user.getRole().getPermissions().forEach(permission -> {
                if (permission.getCode() != null && !permission.getCode().isBlank()) {
                    authorities.add(new SimpleGrantedAuthority(permission.getCode()));
                }
            });
        }
        
        return authorities;
    }
}
