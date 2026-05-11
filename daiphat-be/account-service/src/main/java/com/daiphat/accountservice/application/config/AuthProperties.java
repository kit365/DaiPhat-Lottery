package com.daiphat.accountservice.application.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;

@Data
@ConfigurationProperties(prefix = "daiphat.auth")
public class AuthProperties {
    @Value("${FRONTEND_URL:http://localhost:5173}")
    private String frontendUrl;
    private VerificationPaths verificationPaths = new VerificationPaths();
    private Lockout lockout = new Lockout();
    private Cache cache = new Cache();
    private Token token = new Token();
    private Email email = new Email();
    private PasswordPolicy passwordPolicy = new PasswordPolicy();
    private Cookie cookie = new Cookie();
    private Keycloak keycloak = new Keycloak();

    @Data
    public static class VerificationPaths {
        private String clientPath = "/?verify_token=";
        private String adminPath = "/admin/verify-email?token=";
        private String loginPath = "/?auth=login";
    }
 
    @Data
    public static class Cookie {
        private String name = "refresh_token";
        private boolean secure = true;
        private String sameSite = "Lax";
        private String path = null; // System fallback to ApiConstants.AUTH
    }
 
    @Data
    public static class PasswordPolicy {
        private int minLength = 6;
        private int maxLength = 100;
        private boolean requireUppercase = true;
        private boolean requireLowercase = false;
        private boolean requireDigit = false;
        private boolean requireSpecial = false;
        private boolean noSpace = true;
        private String pattern = "^[A-Z][^\\s]{5,99}$";
    }

    @Data
    public static class Email {
        private int maxRetries = 3;
        private Duration initialBackoff = Duration.ofSeconds(5);
        private Duration maxBackoff = Duration.ofMinutes(5);
    }

    @Data
    public static class Lockout {
        private Duration maxDuration = Duration.ofMinutes(10);
        private int failureThreshold = 5;
        private Duration failureWindow = Duration.ofHours(24);
        private Duration lockTimeout = Duration.ofSeconds(5);
        private long[] backoffSeconds = { 60, 300, 1800, 3600, 7200, 86400 };

        private Spam spam = new Spam();

        @Data
        public static class Spam {
            private int maxAttempts = 3;
            private int windowSeconds = 5;
        }
    }

    @Data
    public static class Cache {
        private Duration verificationTokenTtl = Duration.ofHours(24);
        private Duration otpTtl = Duration.ofMinutes(5);
        private Duration resetTokenTtl = Duration.ofMinutes(15);
        private Duration mfaSessionTtl = Duration.ofMinutes(15);
    }

    @Data
    public static class Token {
        private Duration rememberMeTtl = Duration.ofDays(30);
    }

    @Data
    public static class Keycloak {
        private String authServerUrl;
        private String internalAuthServerUrl;
        private String realm;
        private String clientId;
        private String clientSecret;
        private String adminClientId;
        private String adminClientSecret;
    }
}
