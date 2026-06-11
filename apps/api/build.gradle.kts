plugins {
	java
	checkstyle
	pmd
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
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("com.tngtech.archunit:archunit-junit5:1.3.0")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// ---------- Checkstyle (A그룹: 스타일/라인/분기 자동 차단) — docs/rules/rules-review-bot.md A섹션 ----------
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
