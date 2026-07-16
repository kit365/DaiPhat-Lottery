package com.daiphat.coreapi.infrastructure.security;

import com.daiphat.coreapi.application.config.AuthProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class AuthCookieConfigurationValidator {

    private static final Set<String> VALID_SAME_SITE_VALUES = Set.of("strict", "lax", "none");

    private final AuthProperties authProperties;
    private final Environment environment;

    @PostConstruct
    void validate() {
        AuthProperties.Cookie cookie = authProperties.getCookie();
        String sameSite = cookie.getSameSite() == null
                ? ""
                : cookie.getSameSite().toLowerCase(Locale.ROOT);

        if (cookie.getName() == null || cookie.getName().isBlank()) {
            throw new IllegalStateException("AUTH_REFRESH_COOKIE_NAME must not be blank");
        }
        if (cookie.getPath() == null || cookie.getPath().isBlank() || !cookie.getPath().startsWith("/")) {
            throw new IllegalStateException("AUTH_REFRESH_COOKIE_PATH must be an absolute path");
        }
        if (!VALID_SAME_SITE_VALUES.contains(sameSite)) {
            throw new IllegalStateException("AUTH_REFRESH_COOKIE_SAME_SITE must be Strict, Lax, or None");
        }
        if (("none".equals(sameSite) || cookie.getName().startsWith("__Secure-")) && !cookie.isSecure()) {
            throw new IllegalStateException("Secure refresh cookies require AUTH_REFRESH_COOKIE_SECURE=true");
        }
        if (isProduction()) {
            if (!cookie.isSecure()) {
                throw new IllegalStateException("Production refresh cookie must be Secure");
            }
            if (authProperties.getCors().getAllowedOrigins() == null
                    || authProperties.getCors().getAllowedOrigins().isEmpty()
                    || authProperties.getCors().getAllowedOrigins().stream()
                    .anyMatch(origin -> "*".equals(origin) || !origin.startsWith("https://"))) {
                throw new IllegalStateException("Production CORS origins must be explicit HTTPS origins");
            }
        }
    }

    private boolean isProduction() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }
}
