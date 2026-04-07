
set -e

# Danh sách các database cần tạo
databases=("daiphat_account_db" "daiphat_keycloak_db" "daiphat_ticket_db" "daiphat_payment_db")

# 1. Kích hoạt extension vector ở database mặc định
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL

# 2. Tạo các database và kích hoạt extension vector cho từng cái
for db in "${databases[@]}"; do
    echo "Checking/Creating database: $db and enabling pgvector..."
    # Kiểm tra xem DB đã tồn tại chưa
    DB_EXISTS=$(psql -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" --username "$POSTGRES_USER" --dbname "postgres")
    
    if [ "$DB_EXISTS" != "1" ]; then
        echo "Database $db does not exist. Creating..."
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
            CREATE DATABASE "$db";
EOSQL
    else
        echo "Database $db already exists. Skipping creation."
    fi

    # Luôn đảm bảo extension được kích hoạt (nếu DB đã có sẵn)
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-EOSQL
        CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
done
