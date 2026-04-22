package com.daiphat.apigatewayservice.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.stream.Collectors;

/**
 * Global filter that extracts user identity from the authenticated JWT token 
 * and propagates it to downstream services via internal HTTP headers.
 */
@Component
@Slf4j
public class IdentityPropagationFilter implements GlobalFilter, Ordered {

    @Value("${DAIPHAT_GATEWAY_SECRET:}")
    private String gatewaySecret;

    @Override
    @NonNull
    public Mono<Void> filter(@NonNull ServerWebExchange exchange, @NonNull GatewayFilterChain chain) {
        ServerHttpRequest.Builder builder = exchange.getRequest().mutate();
        
        // Remove existing X-Internal-* and X-Gateway-Secret headers
        HttpHeaders headers = exchange.getRequest().getHeaders();
        for (String headerName : headers.keySet()) {
            if (headerName.toLowerCase().startsWith("x-internal-") || headerName.equalsIgnoreCase("X-Gateway-Secret")) {
                builder.headers(h -> h.remove(headerName));
            }
        }
        
        // Inject Gateway secret
        builder.header("X-Gateway-Secret", gatewaySecret);
        
        return ReactiveSecurityContextHolder.getContext()
                .filter(context -> context.getAuthentication() instanceof JwtAuthenticationToken)
                .map(SecurityContext::getAuthentication)
                .cast(JwtAuthenticationToken.class)
                .flatMap(auth -> {
                    Jwt jwt = auth.getToken();
                    
                    // Extract claims with fallbacks
                    String email = jwt.getClaimAsString("email");
                    String username = jwt.getClaimAsString("preferred_username");
                    if (username == null || username.isBlank()) {
                        username = email;
                    }

                    String firstName = jwt.getClaimAsString("given_name");
                    String lastName = jwt.getClaimAsString("family_name");
                    String avatarUrl = jwt.getClaimAsString("picture");

                    String roles = auth.getAuthorities().stream()
                            .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                            .collect(Collectors.joining(","));
                    if (roles == null) roles = "";

                    // DEBUG: Log all claims for troubleshooting
                    log.info("--- OAUTH IDENTITY DEBUG ---");
                    log.info("Subject (Sub): {}", jwt.getSubject());
                    log.info("Claims: {}", jwt.getClaims());
                    log.info("Propagating: User={}, Email={}, Roles={}", username, email, roles);
                    log.info("----------------------------");

                    // Map identity to X-Internal headers with URL encoding for safety (Vietnamese chars/special chars)
                    try {
                        if (jwt.getSubject() != null) builder.header("X-Internal-User-Id", jwt.getSubject());
                        if (username != null) builder.header("X-Internal-User-Name", username);
                        if (email != null) builder.header("X-Internal-User-Email", email);
                        
                        if (firstName != null) {
                            builder.header("X-Internal-User-First-Name", 
                                    java.net.URLEncoder.encode(firstName, java.nio.charset.StandardCharsets.UTF_8));
                        }
                        if (lastName != null) {
                            builder.header("X-Internal-User-Last-Name", 
                                    java.net.URLEncoder.encode(lastName, java.nio.charset.StandardCharsets.UTF_8));
                        }
                        if (avatarUrl != null) {
                            builder.header("X-Internal-User-Avatar", 
                                    java.net.URLEncoder.encode(avatarUrl, java.nio.charset.StandardCharsets.UTF_8));
                        }
                        builder.header("X-Internal-User-Roles", roles);
                    } catch (Exception e) {
                        log.error("Failed to encode identity headers", e);
                    }

                    ServerHttpRequest mutatedRequest = builder.build();
                    return chain.filter(exchange.mutate().request(mutatedRequest).build())
                            .thenReturn(true);
                })
                .switchIfEmpty(Mono.defer(() -> {
                     ServerHttpRequest mutatedRequest = builder.build();
                     return chain.filter(exchange.mutate().request(mutatedRequest).build()).thenReturn(false);
                }))
                .then();
    }

    @Override
    public int getOrder() {
        // High order ensures it runs AFTER the security filter has populated the context
        return 10000; 
    }
}
