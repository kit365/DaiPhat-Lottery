package com.daiphat.coreapi;

import java.io.IOException;
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
     * Local IntelliJ runs often use {@code daiphat-be} as the working directory, while
     * core-api secrets/profile live in {@code daiphat-be/core-api/.env}. Load module
     * {@code .env} first (first-wins), then the repository-root {@code .env} next to
     * {@code docker-compose.yml}.
     */
    private static void loadLocalDotEnv() {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        Path repoRoot = findRepositoryRoot(cwd);
        for (Path envFile : resolveLocalEnvFiles(cwd, repoRoot)) {
            loadEnvFile(envFile);
        }
    }

    private static List<Path> resolveLocalEnvFiles(Path cwd, Path repoRoot) {
        Set<Path> candidates = new LinkedHashSet<>();
        // Most specific first — setLocalPropertyIfAbsent keeps the first value.
        candidates.add(cwd.resolve(".env"));
        candidates.add(cwd.resolve("core-api").resolve(".env"));
        if (repoRoot != null) {
            candidates.add(repoRoot.resolve("daiphat-be").resolve("core-api").resolve(".env"));
            candidates.add(repoRoot.resolve(".env"));
        }

        List<Path> existing = new ArrayList<>();
        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                existing.add(candidate);
            }
        }
        return existing;
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
            List<String> lines = Files.readAllLines(envFile);
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
        } catch (IOException ignored) {
            // Local environment loading is optional outside the development checkout.
        }
    }

    private static void setLocalPropertyIfAbsent(String key, String value) {
        if (System.getenv(key) != null || System.getProperty(key) != null) {
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
