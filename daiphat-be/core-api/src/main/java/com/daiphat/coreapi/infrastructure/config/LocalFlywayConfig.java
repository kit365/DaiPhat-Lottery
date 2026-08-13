package com.daiphat.coreapi.infrastructure.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Local dev: migration SQL files are sometimes edited in place after they were already
 * applied. Flyway then fails on checksum mismatch. Repair realigns flyway_schema_history
 * with the current files before migrate runs.
 */
@Configuration
@Profile("local")
public class LocalFlywayConfig {

    @Bean
    public FlywayMigrationStrategy localFlywayMigrationStrategy() {
        return (Flyway flyway) -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
