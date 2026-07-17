package com.daiphat.coreapi;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.config.PaymentProperties;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties({AuthProperties.class, PaymentProperties.class, OrderRefundProperties.class})
public class CoreApiApplication {

    public static void main(String[] args) {
        // Lottery draw schedules follow Vietnam time; pin the JVM zone so every
        // LocalDate/LocalTime.now() matches business time regardless of host timezone.
        TimeZone.setDefault(TimeZone.getTimeZone(com.daiphat.coreapi.shared.util.DrawScheduleUtils.VIETNAM_ZONE));
        loadLocalDotEnv();
        SpringApplication.run(CoreApiApplication.class, args);
    }

    /**
     * IntelliJ often runs with working directory {@code daiphat-be}, while {@code .env}
     * lives in {@code core-api/.env}. spring-dotenv may not resolve that path, so we
     * load the first matching file before Spring resolves placeholders.
     */
    private static void loadLocalDotEnv() {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        Path[] candidates = {
                cwd.resolve("core-api").resolve(".env"),
                cwd.resolve(".env")
        };

        for (Path envFile : candidates) {
            if (!Files.isRegularFile(envFile)) {
                continue;
            }
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
                // spring-dotenv may still load env from another working directory
            }
            return;
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
