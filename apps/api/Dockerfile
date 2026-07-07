# changmun api 배포 이미지. 빌드 컨텍스트 = 레포 루트여야 한다(db/migrations 포함 위함):
#   docker build -f apps/api/Dockerfile -t changmun-api .

# ── Build stage: Gradle bootJar (Java 21) ─────────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# 빌드 파일 먼저 복사 → 소스만 바뀔 때 의존성 레이어 캐시 재사용
COPY apps/api/gradlew ./
COPY apps/api/gradle ./gradle
COPY apps/api/settings.gradle.kts apps/api/build.gradle.kts ./
COPY apps/api/config ./config
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies >/dev/null 2>&1 || true

# 소스 복사 후 실행 가능 JAR만 빌드(테스트·정적분석은 CI 몫 — 배포 아티팩트만 뽑는다)
COPY apps/api/src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ── Runtime stage: JRE + jar + Flyway 마이그레이션 ────────────────────────
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# settings.gradle rootProject.name=api → api-<version>.jar (bootJar 단독 실행이라 plain jar 없음)
COPY --from=build /build/build/libs/api-*.jar app.jar

# 스키마의 단일 진실 — Flyway가 기동 시 이 경로에서 마이그레이션 적용(application.yml DB_MIGRATIONS_DIR)
COPY db/migrations /app/db/migrations
ENV DB_MIGRATIONS_DIR=/app/db/migrations

# t3.micro(1GB RAM) 대비 — 컨테이너 메모리 비율로 힙 상한. 런타임 env로 덮어쓰기 가능.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70.0"

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
