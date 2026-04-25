FROM eclipse-temurin:17-jdk AS build

WORKDIR /workspace

COPY backend/gradlew ./gradlew
COPY backend/gradle ./gradle
COPY backend/build.gradle ./build.gradle
COPY backend/settings.gradle ./settings.gradle

RUN chmod +x gradlew

COPY backend/src ./src

RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre

WORKDIR /app

ENV JAVA_OPTS="-Xms256m -Xmx1024m"

COPY --from=build /workspace/build/libs/*.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
