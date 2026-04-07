package com.daiphat.apigatewayservice.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
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

    @Override
    @NonNull
    public Mono<Void> filter(@NonNull ServerWebExchange exchange, @NonNull GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .filter(context -> context.getAuthentication() instanceof JwtAuthenticationToken)
                .map(SecurityContext::getAuthentication)
                .cast(JwtAuthenticationToken.class)
                .flatMap(auth -> {
                    Jwt jwt = auth.getToken();
                    
                    // Extract claims
                    String userId = jwt.getSubject();
                    String username = jwt.getClaimAsString("preferred_username");
                    String email = jwt.getClaimAsString("email");
                    String roles = auth.getAuthorities().stream()
                            .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                            .collect(Collectors.joining(","));

                    log.debug("Propagating identity: USER={}, ROLES={}", username, roles);

                    // Mutate request with internal headers
                    ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                            .header("X-Internal-User-Id", userId)
                            .header("X-Internal-User-Name", username)
                            .header("X-Internal-User-Email", email)
                            .header("X-Internal-User-Roles", roles)
                            .build();

                    return chain.filter(exchange.mutate().request(mutatedRequest).build())
                            .thenReturn(true);
                })
                .switchIfEmpty(Mono.defer(() -> chain.filter(exchange).thenReturn(false)))
                .then();
    }

    @Override
    public int getOrder() {
        // High order ensures it runs AFTER the security filter has populated the context
        return 10000; 
    }
}
