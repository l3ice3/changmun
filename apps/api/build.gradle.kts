plugins {
	java
	checkstyle
	pmd
	id("com.diffplug.spotless") version "6.25.0"
	id("org.springframework.boot") version "4.1.0"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.changmun"
version = "0.0.1-SNAPSHOT"
description = "changmun read-only serving API"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	// Lombok — getter 보일러플레이트 축소용. @Getter만 사용(@Setter·@Data 금지 — api.md 규칙).
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")
	testCompileOnly("org.projectlombok:lombok")
	testAnnotationProcessor("org.projectlombok:lombok")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
	implementation("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("com.tngtech.archunit:archunit-junit5:1.3.0")
	// Testcontainers — 리포지토리 네이티브 쿼리(배열 overlap·pg_trgm·NULLS LAST)는 실 PostgreSQL로만
	// 정직하게 검증된다(H2는 거짓 통과). 근거: .claude/rules/api.md §테스트.
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.4"))
	testImplementation("org.testcontainers:junit-jupiter")
	testImplementation("org.testcontainers:postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// ---------- Checkstyle (A그룹: 스타일/라인/분기 자동 차단) — AGENTS.md §2 리뷰 분담 A그룹 ----------
checkstyle {
	toolVersion = "10.20.1"
	configFile = file("$rootDir/config/checkstyle.xml")
	maxWarnings = 0
	maxErrors = 0
	isIgnoreFailures = false
}

// ---------- PMD (A그룹: 필드수/디미터 등) ----------
pmd {
	toolVersion = "7.7.0"
	ruleSetFiles = files("$rootDir/config/pmd-ruleset.xml")
	ruleSets = listOf() // 기본 룰셋 비활성, 커스텀만 사용
	isIgnoreFailures = false
}

// ---------- Spotless (자동 포맷 — Google Java Format, 100 wrap < checkstyle 120) ----------
// spotlessApply: 자동 정렬 / spotlessCheck: 검사(check 태스크에 자동 연결, 실패 시 머지 불가)
spotless {
	java {
		googleJavaFormat()
		removeUnusedImports()
		trimTrailingWhitespace()
		endWithNewline()
	}
}
