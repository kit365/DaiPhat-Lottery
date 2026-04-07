package com.daiphat.accountservice.infrastructure.config.security;

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

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final InternalAuthenticationEntryPoint internalAuthenticationEntryPoint;

    @Bean
    public InternalAuthenticationFilter internalAuthenticationFilter() {
        return new InternalAuthenticationFilter();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // Typically disabled for stateless API
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authz -> authz
                        // Permit Options requests
                        .requestMatchers(HttpMethod.OPTIONS).permitAll()
                        // Permit Actuator completely
                        .requestMatchers("/actuator/**").permitAll()
                        // Permit Swagger/Docs completely
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/webjars/**").permitAll()
                        
                        // Permit Auth endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                )
                // Handle unauthorized exceptions with custom entry point
                .exceptionHandling(exception -> exception.authenticationEntryPoint(internalAuthenticationEntryPoint))
                // Trust Gateway identity via internal filter
                .addFilterBefore(internalAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
