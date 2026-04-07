# --- Stage 1: Build stage (Maven + BuildKit Cache) ---
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy Parent POM first (Build from root context)
COPY pom.xml .

# Copy module specific files
COPY api-gateway-service/pom.xml api-gateway-service/
COPY api-gateway-service/src api-gateway-service/src

# Build only the module (Main building phase)
# skipping checkstyle inside Docker to ensure stability (already enforced in CI/CD)
RUN --mount=type=cache,target=/root/.m2 mvn -f api-gateway-service/pom.xml clean package -DskipTests -Dcheckstyle.skip

# Tuyệt chiêu: Gọt giũa JRE tí hon (~45MB)
RUN jlink \
    --add-modules java.base,java.sql,java.naming,java.desktop,java.management,java.security.jgss,java.instrument \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /javaruntime

# --- Stage 2: Runtime stage (Siêu mỏng) ---
FROM alpine:latest
WORKDIR /app

# Thêm curl để phục vụ Healthcheck từ Docker Compose
RUN apk add --no-cache curl

# Copy JRE tí hon và file JAR sang
COPY --from=build /javaruntime /javaruntime
COPY --from=build /app/api-gateway-service/target/*.jar app.jar

# Chạy app bằng JRE tí hon
ENTRYPOINT ["/javaruntime/bin/java", "-jar", "app.jar"]
