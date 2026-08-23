# syntax=docker/dockerfile:1.7

FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B clean package -Dmaven.test.skip=true -Dcheckstyle.skip

RUN jlink \
    --add-modules java.base,java.sql,java.naming,java.desktop,java.management,java.security.jgss,java.instrument,java.net.http,java.xml,java.compiler,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.management \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /javaruntime

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates curl tzdata \
    && addgroup -S daiphat \
    && adduser -S daiphat -G daiphat
COPY --from=build /javaruntime /javaruntime
COPY --from=build --chown=daiphat:daiphat /workspace/target/*.jar app.jar

USER daiphat
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/actuator/health/readiness || exit 1

ENTRYPOINT ["/javaruntime/bin/java", "-jar", "/app/app.jar"]
