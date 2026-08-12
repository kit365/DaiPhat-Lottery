package com.daiphat.coreapi.infrastructure.persistence.streetagent;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Clean PostgreSQL + Flyway gate for vendor allocation schema.
 * Enable with {@code RUN_TESTCONTAINERS=true} so default unit runs stay fast and skip Docker probing.
 */
@EnabledIfEnvironmentVariable(named = "RUN_TESTCONTAINERS", matches = "true")
@DisplayName("VendorAllocationSchemaFlywayIT")
class VendorAllocationSchemaFlywayIT {

    private static PostgreSQLContainer<?> postgres;

    @BeforeAll
    static void startPostgres() {
        postgres = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("daiphat_vendor_it")
                .withUsername("test")
                .withPassword("test");
        postgres.start();
    }

    @AfterAll
    static void stopPostgres() {
        if (postgres != null) {
            postgres.stop();
        }
    }

    @Test
    @DisplayName("Flyway clean migrate creates vendor unique indexes and report detail FK")
    void flyway_creates_vendor_constraints() throws Exception {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();

        try (Connection connection = DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()
        )) {
            Set<String> indexes = queryIndexNames(connection);
            assertThat(indexes).contains(
                    "uq_active_agent_ticket_stock",
                    "uq_allocation_batch_one_open_per_profile",
                    "uq_daily_sales_reports_agent_date",
                    "uq_daily_sales_report_details_report_detail",
                    "uq_agent_settlements_batch"
            );

            try (PreparedStatement ps = connection.prepareStatement(
                    """
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage ccu
                      ON ccu.constraint_name = tc.constraint_name
                     AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name = 'daily_sales_report_details'
                      AND kcu.column_name = 'detail_id'
                      AND ccu.table_name = 'allocation_batch_details'
                    """
            ); ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
            }
        }
    }

    private static Set<String> queryIndexNames(Connection connection) throws Exception {
        Set<String> names = new HashSet<>();
        try (PreparedStatement ps = connection.prepareStatement(
                """
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname LIKE 'uq_%'
                """
        ); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                names.add(rs.getString(1));
            }
        }
        return names;
    }
}
