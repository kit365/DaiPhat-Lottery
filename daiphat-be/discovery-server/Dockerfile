FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app
COPY . .
# Chiêu cuối: Dùng Cache Mount để không bao giờ phải tải lại thư viện Maven
RUN --mount=type=cache,target=/root/.m2 mvn clean package -pl discovery-server -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/discovery-server/target/*.jar app.jar
RUN apk add --no-cache wget
EXPOSE 8761
ENTRYPOINT ["java", "-jar", "app.jar"]
