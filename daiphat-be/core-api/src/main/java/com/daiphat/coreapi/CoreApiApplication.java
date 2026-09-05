package com.daiphat.coreapi;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.config.PaymentProperties;
import com.daiphat.coreapi.application.config.VendorTestSeedProperties;

@SpringBootApplication
@EntityScan(basePackages = "com.daiphat.coreapi.infrastructure.persistence.entity")
@EnableJpaRepositories(basePackages = "com.daiphat.coreapi.infrastructure.persistence.repository")
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties({AuthProperties.class, PaymentProperties.class, OrderRefundProperties.class,
        VendorTestSeedProperties.class})
public class CoreApiApplication {

    public static void main(String[] args) {
        // Lottery draw schedules follow Vietnam time; pin the JVM zone so every
        // LocalDate/LocalTime.now() matches business time regardless of host timezone.
        TimeZone.setDefault(TimeZone.getTimeZone(com.daiphat.coreapi.shared.util.DrawScheduleUtils.VIETNAM_ZONE));
        loadLocalDotEnv();
        SpringApplication.run(CoreApiApplication.class, args);
    }

    /**
     * Local development loads the canonical repository-root {@code .env} (next to
     * {@code docker-compose.yml}), matching Docker Compose {@code env_file: ./.env}.
     * Optional module-level files and {@code DAIPHAT_ENV_FILE} may supply overrides;
     * first value wins via {@link #setLocalPropertyIfAbsent}.
     */
    private static void loadLocalDotEnv() {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        Path repoRoot = findRepositoryRoot(cwd);
        List<Path> envFiles = resolveLocalEnvFiles(cwd, repoRoot);
        if (envFiles.isEmpty()) {
            System.out.println("[env] No local .env found (cwd=" + cwd
                    + ", repoRoot=" + (repoRoot != null ? repoRoot : "n/a")
                    + "). Relying on process environment / IDE run config.");
            return;
        }
        for (Path envFile : envFiles) {
            loadEnvFile(envFile);
            System.out.println("[env] Loaded " + envFile.toAbsolutePath().normalize());
        }
        mirrorAuthJwtSystemProperties();
        applyLocalProfileAuthCookieDefaults();
        applyLocalProfileAccessTokenTtlDefaults();
    }

    /**
     * Repo-root {@code .env} may set {@code AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS=5} for refresh-token
     * experiments. That value is bridged onto {@code daiphat.auth.jwt.access-token-ttl-seconds}
     * and overrides YAML, so every admin API (including OCR template image upload) starts
     * returning 401 after a few seconds. Cap a sane minimum unless explicitly opted in.
     */
    private static void applyLocalProfileAccessTokenTtlDefaults() {
        String allowShort = firstNonBlank(
                System.getProperty("DAIPHAT_ALLOW_SHORT_ACCESS_TTL"),
                System.getenv("DAIPHAT_ALLOW_SHORT_ACCESS_TTL"));
        if ("true".equalsIgnoreCase(allowShort)) {
            return;
        }

        String raw = firstNonBlank(
                System.getProperty("daiphat.auth.jwt.access-token-ttl-seconds"),
                System.getProperty("AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS"),
                System.getenv("AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS"));
        long ttlSeconds = 900L;
        if (raw != null) {
            try {
                ttlSeconds = Long.parseLong(raw.trim());
            } catch (NumberFormatException ignored) {
                ttlSeconds = 900L;
            }
        }
        if (ttlSeconds >= 60L) {
            return;
        }

        System.setProperty("AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS", "900");
        System.setProperty("daiphat.auth.jwt.access-token-ttl-seconds", "900");
        System.out.println(
                "[env] AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS=" + raw
                        + " is too short for interactive use; forcing 900s"
                        + " (set DAIPHAT_ALLOW_SHORT_ACCESS_TTL=true to keep short TTL)"
        );
    }

    /**
     * Team {@code .env} may carry production cookie names ({@code __Secure-*}) while
     * {@code secure=false} for HTTP localhost. That fails {@link com.daiphat.coreapi.infrastructure.security.AuthCookieConfigurationValidator}.
     * When {@code local} is active, force the same safe values as {@code application-local.yml}.
     */
    private static void applyLocalProfileAuthCookieDefaults() {
        String profiles = firstNonBlank(
                System.getProperty("spring.profiles.active"),
                System.getenv("SPRING_PROFILES_ACTIVE"));
        if (profiles == null || !profiles.contains("local")) {
            return;
        }

        System.setProperty("AUTH_REFRESH_COOKIE_NAME", "refresh_token");
        System.setProperty("AUTH_REFRESH_COOKIE_SECURE", "false");
        System.setProperty("AUTH_REFRESH_COOKIE_SAME_SITE", "Lax");
        // Path=/ — not /api/v1/auth. Narrow path + FE proxy rewrite to Path=/ left
        // duplicate cookies; Spring @CookieValue then often reads the stale one → 401 logout.
        System.setProperty("AUTH_REFRESH_COOKIE_PATH", "/");
        System.setProperty("daiphat.auth.cookie.name", "refresh_token");
        System.setProperty("daiphat.auth.cookie.secure", "false");
        System.setProperty("daiphat.auth.cookie.same-site", "Lax");
        System.setProperty("daiphat.auth.cookie.path", "/");
        System.out.println("[env] local profile: using HTTP-safe refresh cookie settings (refresh_token, Path=/, Secure=false)");
    }

    private static List<Path> resolveLocalEnvFiles(Path cwd, Path repoRoot) {
        Set<Path> candidates = new LinkedHashSet<>();

        // Explicit override (absolute path, or relative to cwd). Never hard-code user folders.
        Path override = resolveEnvFileOverride(cwd);
        if (override != null) {
            candidates.add(override);
        }

        // Canonical location: repository root (same file Docker Compose uses).
        if (repoRoot != null) {
            candidates.add(repoRoot.resolve(".env"));
        }

        // Optional module-local files (only applied for keys not already set).
        candidates.add(cwd.resolve(".env"));
        candidates.add(cwd.resolve("core-api").resolve(".env"));
        if (repoRoot != null) {
            candidates.add(repoRoot.resolve("daiphat-be").resolve("core-api").resolve(".env"));
        }

        List<Path> existing = new ArrayList<>();
        for (Path candidate : candidates) {
            Path normalized = candidate.toAbsolutePath().normalize();
            if (Files.isRegularFile(normalized) && !existing.contains(normalized)) {
                existing.add(normalized);
            }
        }
        return existing;
    }

    private static Path resolveEnvFileOverride(Path cwd) {
        String override = firstNonBlank(
                System.getenv("DAIPHAT_ENV_FILE"),
                System.getProperty("DAIPHAT_ENV_FILE"));
        if (override == null) {
            return null;
        }
        Path path = Paths.get(override);
        if (!path.isAbsolute()) {
            path = cwd.resolve(path);
        }
        return path.toAbsolutePath().normalize();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static Path findRepositoryRoot(Path startingDirectory) {
        for (Path directory = startingDirectory; directory != null; directory = directory.getParent()) {
            if (Files.isRegularFile(directory.resolve("docker-compose.yml"))) {
                return directory;
            }
        }
        return null;
    }

    private static void loadEnvFile(Path envFile) {
        try {
            List<String> lines = Files.readAllLines(envFile, StandardCharsets.UTF_8);
            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int separator = line.indexOf('=');
                if (separator <= 0) {
                    continue;
                }
                String key = line.substring(0, separator).trim();
                String value = stripQuotes(line.substring(separator + 1).trim());
                setLocalPropertyIfAbsent(key, value);
            }
        } catch (IOException ex) {
            System.err.println("[env] Failed to read " + envFile.toAbsolutePath().normalize()
                    + ": " + ex.getMessage());
        }
    }

    /**
     * Keys that must come from the repo {@code .env} even when the IDE injects a
     * stale process env (e.g. {@code AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS=5} left over
     * from refresh-token testing — that floods Admin sidebar polls with 401s).
     */
    private static final Set<String> DOTENV_OVERRIDES = Set.of(
            "AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS",
            "AUTH_JWT_REFRESH_TOKEN_TTL_SECONDS",
            "AUTH_REFRESH_COOKIE_NAME",
            "AUTH_REFRESH_COOKIE_SECURE",
            "AUTH_REFRESH_COOKIE_SAME_SITE",
            "AUTH_REFRESH_COOKIE_PATH",
            // Prevent stale IDE env (e.g. temporary schema-cleanup verify DB) from
            // shadowing the repo .env and spamming Postgres with FATAL connect errors.
            "CORE_POSTGRES_DB",
            "CORE_POSTGRES_HOST",
            "CORE_POSTGRES_USER",
            "CORE_POSTGRES_PASSWORD",
            "CORE_DB_PORT",
            "LOCAL_POSTGRES_PORT",
            "CORE_POSTGRES_JDBC_URL"
    );

    private static void setLocalPropertyIfAbsent(String key, String value) {
        boolean forceFromDotEnv = DOTENV_OVERRIDES.contains(key);
        if (!forceFromDotEnv && (System.getenv(key) != null || System.getProperty(key) != null)) {
            return;
        }

        // Active profiles are resolved during Spring's bootstrap phase. When a
        // .env entry is exposed as a Java system property, it must use Spring's
        // canonical property name rather than the environment-variable name.
        if ("SPRING_PROFILES_ACTIVE".equals(key)) {
            if (System.getProperty("spring.profiles.active") == null) {
                System.setProperty("spring.profiles.active", value);
            }
            return;
        }

        System.setProperty(key, value);
        bridgeEnvKeyToSpringProperty(key, value);
    }

    /**
     * {@code AUTH_JWT_SECRET} does not relax-bind to {@code daiphat.auth.jwt.secret}.
     * Mirror the common auth env keys onto the property names used by {@code @Value},
     * including values already present in the process environment (IntelliJ EnvFile).
     */
    private static void bridgeEnvKeyToSpringProperty(String key, String value) {
        String springKey = switch (key) {
            case "AUTH_JWT_SECRET" -> "daiphat.auth.jwt.secret";
            case "AUTH_JWT_ISSUER" -> "daiphat.auth.jwt.issuer";
            case "AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS" -> "daiphat.auth.jwt.access-token-ttl-seconds";
            case "AUTH_JWT_REFRESH_TOKEN_TTL_SECONDS" -> "daiphat.auth.jwt.refresh-token-ttl-seconds";
            case "AUTH_REFRESH_COOKIE_NAME" -> "daiphat.auth.cookie.name";
            case "AUTH_REFRESH_COOKIE_SECURE" -> "daiphat.auth.cookie.secure";
            case "AUTH_REFRESH_COOKIE_SAME_SITE" -> "daiphat.auth.cookie.same-site";
            case "AUTH_REFRESH_COOKIE_PATH" -> "daiphat.auth.cookie.path";
            default -> null;
        };
        if (springKey != null && System.getProperty(springKey) == null && value != null && !value.isBlank()) {
            System.setProperty(springKey, value);
        }
    }

    private static void mirrorAuthJwtSystemProperties() {
        bridgeEnvKeyToSpringProperty("AUTH_JWT_SECRET", firstNonBlank(
                System.getProperty("AUTH_JWT_SECRET"), System.getenv("AUTH_JWT_SECRET")));
        bridgeEnvKeyToSpringProperty("AUTH_JWT_ISSUER", firstNonBlank(
                System.getProperty("AUTH_JWT_ISSUER"), System.getenv("AUTH_JWT_ISSUER")));
        bridgeEnvKeyToSpringProperty("AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS", firstNonBlank(
                System.getProperty("AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS"),
                System.getenv("AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS")));
        bridgeEnvKeyToSpringProperty("AUTH_JWT_REFRESH_TOKEN_TTL_SECONDS", firstNonBlank(
                System.getProperty("AUTH_JWT_REFRESH_TOKEN_TTL_SECONDS"),
                System.getenv("AUTH_JWT_REFRESH_TOKEN_TTL_SECONDS")));
        bridgeEnvKeyToSpringProperty("AUTH_REFRESH_COOKIE_NAME", firstNonBlank(
                System.getProperty("AUTH_REFRESH_COOKIE_NAME"), System.getenv("AUTH_REFRESH_COOKIE_NAME")));
        bridgeEnvKeyToSpringProperty("AUTH_REFRESH_COOKIE_SECURE", firstNonBlank(
                System.getProperty("AUTH_REFRESH_COOKIE_SECURE"), System.getenv("AUTH_REFRESH_COOKIE_SECURE")));
        bridgeEnvKeyToSpringProperty("AUTH_REFRESH_COOKIE_SAME_SITE", firstNonBlank(
                System.getProperty("AUTH_REFRESH_COOKIE_SAME_SITE"), System.getenv("AUTH_REFRESH_COOKIE_SAME_SITE")));
        bridgeEnvKeyToSpringProperty("AUTH_REFRESH_COOKIE_PATH", firstNonBlank(
                System.getProperty("AUTH_REFRESH_COOKIE_PATH"), System.getenv("AUTH_REFRESH_COOKIE_PATH")));
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        return null;
    }

    private static String stripQuotes(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}
