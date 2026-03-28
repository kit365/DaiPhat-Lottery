#!/bin/bash
set -e

# Script để tự động tạo hàng loạt database cho từng Microservice trên cùng 1 instance Postgres duy nhất
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE account_db;
    CREATE DATABASE lottery_db;
    CREATE DATABASE payment_db;
EOSQL
