# syntax=docker/dockerfile:1.7

FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B clean package -Dmaven.test.skip=true -Dcheckstyle.skip

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache ca-certificates curl tzdata \
    && addgroup -S daiphat \
    && adduser -S daiphat -G daiphat
COPY --from=build --chown=daiphat:daiphat /workspace/target/*.jar app.jar

USER daiphat
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/actuator/health/readiness || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

