FROM public.ecr.aws/docker/library/maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy toàn bộ code của daiphat-be vào
COPY . .

# Build module discovery-server
RUN --mount=type=cache,target=/root/.m2 mvn clean package -pl discovery-server -am -DskipTests

FROM public.ecr.aws/docker/library/eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/discovery-server/target/*.jar app.jar
RUN apk add --no-cache curl wget
EXPOSE 8761
ENTRYPOINT ["java", "-jar", "app.jar"]
