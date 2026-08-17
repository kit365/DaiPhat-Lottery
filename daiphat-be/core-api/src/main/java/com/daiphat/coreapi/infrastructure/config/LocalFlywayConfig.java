package com.daiphat.coreapi.infrastructure.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Spring Boot 3.4 dropped {@code spring.flyway.repair-on-migrate}.
 * Only repair when migrate fails (checksum / failed history). Do not repair on every
 * startup: Flyway repair marks classpath-missing scripts as DELETE, which then
 * re-runs already-applied migrations under {@code out-of-order: true}.
 */
@Configuration
@Profile("local")
public class LocalFlywayConfig {

    @Bean
    FlywayMigrationStrategy repairOnMigrateFailure() {
        return (Flyway flyway) -> {
            try {
                flyway.migrate();
            } catch (FlywayException ex) {
                flyway.repair();
                flyway.migrate();
            }
        };
    }
}
