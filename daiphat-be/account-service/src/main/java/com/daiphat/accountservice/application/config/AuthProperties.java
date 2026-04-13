package com.daiphat.accountservice.application.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import java.time.Duration;

@Data
@ConfigurationProperties(prefix = "daiphat.auth")
public class AuthProperties {
    private String frontendUrl = "http://localhost:3000"; // Default for local Dev
    private Lockout lockout = new Lockout();
    private Cache cache = new Cache();
    private Token token = new Token();
    private Email email = new Email();
    private PasswordPolicy passwordPolicy = new PasswordPolicy();
 
    @Data
    public static class PasswordPolicy {
        private int minLength = 8;
        private int maxLength = 32;
        private String pattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,32}$";
    }

    @Data
    public static class Email {
        /**
         * Maximum number of retries for failed email tasks.
         */
        private int maxRetries = 3;

        /**
         * Initial backoff duration for the first retry.
         */
        private Duration initialBackoff = Duration.ofSeconds(5);

        /**
         * Maximum backoff duration.
         */
        private Duration maxBackoff = Duration.ofMinutes(5);
    }

    @Data
    public static class Lockout {
        /**
         * Maximum duration an account can be locked. (Sếp fix: 10m for Forgot/Resend)
         */
        private Duration maxDuration = Duration.ofMinutes(10);
        
        /**
         * Number of failures before triggering a lock.
         */
        private int failureThreshold = 5;

        /**
         * Exponential backoff steps (in seconds).
         */
        private long[] backoffSeconds = {60, 120, 300, 600, 1800}; // 1m, 2m, 5m, 10m, 30m

        /**
         * The rolling window for tracking failed attempts.
         */
        private Duration failureWindow = Duration.ofHours(24);

        /**
         * Timeout for distributed locks.
         */
        private Duration lockTimeout = Duration.ofSeconds(5);

        private Spam spam = new Spam();

        @Data
        public static class Spam {
            /**
             * Maximum attempts allowed within the window before throttling.
             */
            private int maxAttempts = 3;

            /**
             * Window duration in seconds for spam detection.
             */
            private int windowSeconds = 5;
        }
    }

    @Data
    public static class Cache {
        /**
         * TTL for email verification tokens.
         */
        private Duration verificationTokenTtl = Duration.ofHours(24);
        
        /**
         * TTL for mobile/email OTPs.
         */
        private Duration otpTtl = Duration.ofMinutes(5);
        
        /**
         * TTL for password reset session data.
         */
        private Duration resetTokenTtl = Duration.ofMinutes(15);
        
        /**
         * TTL for MFA session states.
         */
        private Duration mfaSessionTtl = Duration.ofMinutes(15);
    }

    @Data
    public static class Token {
        /**
         * TTL for tokens when "Remember Me" is selected.
         */
        private Duration rememberMeTtl = Duration.ofDays(30);
    }
}
