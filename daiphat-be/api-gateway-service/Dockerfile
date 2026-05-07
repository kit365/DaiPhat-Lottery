FROM public.ecr.aws/docker/library/maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# COPY toàn bộ folder daiphat-be vào
COPY . .

# Build module api-gateway-service
RUN --mount=type=cache,target=/root/.m2 mvn clean package -pl api-gateway-service -am -DskipTests -Dcheckstyle.skip

# Gọt giũa JRE
RUN jlink \
    --add-modules java.base,java.sql,java.naming,java.desktop,java.management,java.security.jgss,java.instrument,jdk.unsupported,jdk.crypto.ec \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /javaruntime

FROM public.ecr.aws/docker/library/alpine:latest
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /javaruntime /javaruntime
COPY --from=build /app/api-gateway-service/target/*.jar app.jar
ENTRYPOINT ["/javaruntime/bin/java", "-jar", "app.jar"]
