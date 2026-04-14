# Flyway Migration Guide - DaiPhat

To ensure consistent and safe database schema management across all microservices, please follow this guide when creating Flyway migration files.

## 1. File Location
Migration files must be placed in the following directory of the respective microservice:
`src/main/resources/db/migration/`

## 2. Naming Convention
We use a **Timestamp-based versioning** to avoid version conflicts in a multi-developer environment:

**Format:** `V<YYYYMMDDHHmm>__<description>.sql`

- **V**: Prefix for Versioned migration.
- **YYYYMMDDHHmm**: Year, Month, Day, Hour, Minute (e.g., `202403291030`).
- **__**: Double underscore (required separator).
- **<description>**: Short, descriptive name in snake_case (e.g., `create_users_table`).

**Example:** `V202603291030__create_users_table.sql`

## 3. Best Practices

### A. Idempotency
Ensure your scripts can run safely multiple times (though Flyway handles this, it's good practice).
```sql
CREATE TABLE IF NOT EXISTS users (...)
```

### B. Standard Columns
Every table should generally include auditing columns:
- `id`: Use `UUID` or `BIGSERIAL` (Primary Key).
- `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.
- `updated_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.

### C. One Change per File
Keep migrations small and focused. One file for one logical change (e.g., creating a table, adding a column).

### D. PostgreSQL Compatibility
Since we use PostgreSQL 16+, leverage modern types like `JSONB`, `UUID`, and `TIMESTAMPTZ`.

## 4. How to Apply Migrations
Migrations are applied automatically when the Spring Boot application starts.

To manually check or repair (if a migration failed):
```bash
mvn flyway:info
mvn flyway:repair
```

> [!WARNING]
> Never modify a migration file after it has been applied to the database. If you need to change something, create a **new** migration file.
