FROM public.ecr.aws/docker/library/maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy toàn bộ nội dung của daiphat-be vào
COPY . .

# Build module config-server
RUN --mount=type=cache,target=/root/.m2 mvn clean package -pl config-server -am -DskipTests

FROM public.ecr.aws/docker/library/eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/config-server/target/*.jar app.jar
# Copy folder config vào runtime
COPY --from=builder /app/config /app/config
RUN apk add --no-cache curl wget
EXPOSE 8888
ENTRYPOINT ["java", "-jar", "app.jar"]
