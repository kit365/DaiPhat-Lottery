# --- Stage 1: Build stage (Maven + BuildKit Cache) ---
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn clean package -DskipTests

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
COPY --from=build /app/target/*.jar app.jar

# Chạy app bằng JRE tí hon
ENTRYPOINT ["/javaruntime/bin/java", "-jar", "app.jar"]
