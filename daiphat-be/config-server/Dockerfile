FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app
COPY . .

RUN --mount=type=cache,target=/root/.m2 mvn clean package -pl config-server -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/config-server/target/*.jar app.jar
RUN apk add --no-cache wget
EXPOSE 8888
ENTRYPOINT ["java", "-jar", "app.jar"]
