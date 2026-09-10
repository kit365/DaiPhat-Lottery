package com.daiphat.coreapi.infrastructure.security;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.infrastructure.security.jwt.JwtAuthenticationFilter;
import com.daiphat.coreapi.infrastructure.websocket.WebSocketConfig;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.net.URI;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String AUTH = ApiConstants.API_V1 + "/auth";
    private final AuthProperties authProperties;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                response.sendError(
                                        HttpServletResponse.SC_UNAUTHORIZED,
                                        "Authentication required"
                                ))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/assets/**",
                                "/*.ico",
                                "/*.png",
                                "/*.svg",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/webjars/**",
                                "/actuator/health/**",
                                "/actuator/info",
                                WebSocketConfig.WS_ENDPOINT + "/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST,
                                AUTH + "/login",
                                AUTH + "/google",
                                AUTH + "/refresh-token",
                                AUTH + "/logout",
                                AUTH + "/register",
                                AUTH + "/register/resend-verification",
                                AUTH + "/forgot-password/**",
                                ApiConstants.API_V1 + "/transactions/payment/webhook/*"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET,
                                AUTH + "/verify-email",
                                AUTH + "/password-policy",
                                ApiConstants.API_V1_PUBLIC + "/system-configs",
                                ApiConstants.API_V1_PUBLIC + "/system-configs/**",
                                ApiConstants.API_V1_PUBLIC + "/lucky-pattern-configs",
                                ApiConstants.API_V1 + "/blogs/public",
                                ApiConstants.API_V1 + "/blogs/public/**",
                                ApiConstants.API_V1 + "/blogs/categories/public",
                                ApiConstants.API_V1 + "/lottery-tickets/public",
                                ApiConstants.API_V1 + "/lottery-tickets/home",
                                ApiConstants.API_V1 + "/lottery-results/board/full",
                                ApiConstants.API_V1 + "/lottery-results/board",
                                ApiConstants.API_V1 + "/lottery-results/details",
                                ApiConstants.API_V1 + "/lottery-results/check",
                                ApiConstants.API_V1 + "/lottery-stations/schedule",
                                ApiConstants.API_V1 + "/lottery-stations/schedule/all",
                                ApiConstants.API_V1 + "/lottery-stations/schedule/today",
                                ApiConstants.API_V1 + "/lottery-stations/schedule/tomorrow",
                                ApiConstants.API_V1 + "/transactions/payment/webhook/*",
                                ApiConstants.API_V1 + "/banks",
                                ApiConstants.API_V1 + "/test-jpql"
                        ).permitAll()
                        .requestMatchers(HttpMethod.PATCH,
                                ApiConstants.API_V1 + "/blogs/*/view"
                        ).permitAll()
                        .requestMatchers(ApiConstants.API_V1 + "/**").authenticated()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(resolveAllowedOrigins());
        configuration.setAllowedMethods(authProperties.getCors().getAllowedMethods());
        configuration.setAllowedHeaders(authProperties.getCors().getAllowedHeaders());
        configuration.setAllowCredentials(authProperties.getCors().isAllowCredentials());
        configuration.setMaxAge(authProperties.getCors().getMaxAge());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> resolveAllowedOrigins() {
        List<String> configuredOrigins = authProperties.getCors().getAllowedOrigins();
        if (configuredOrigins != null && !configuredOrigins.isEmpty()) {
            return configuredOrigins;
        }

        String frontendUrl = authProperties.getFrontendUrl();
        if (frontendUrl == null || frontendUrl.isBlank()) {
            return List.of("http://localhost:5173");
        }

        try {
            URI uri = URI.create(frontendUrl);
            if (uri.getScheme() != null && uri.getHost() != null) {
                String origin = uri.getScheme() + "://" + uri.getHost()
                        + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
                return List.of(origin);
            }
        } catch (IllegalArgumentException ignored) {
            // Fallback below if frontendUrl is not a valid URI.
        }

        return List.of(frontendUrl);
    }
}
