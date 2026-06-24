package com.changmun.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * 계층 규칙 자동 검사 (A그룹 중 구조 규칙). 근거: docs/rules/rules-full.md §6 계층
 *
 * <p>패키지 구조 전제: 도메인 단위(opportunity/glossary/event) 아래 레이어 하위패키지 — ..controller.. / ..service.. /
 * ..domain.. / ..repository.. (도메인 우선 분리지만 레이어명은 유지).
 */
@AnalyzeClasses(packages = "com.changmun", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

  /** 도메인은 Repository 인터페이스 너머만 의존한다 → 도메인이 repository 구현/JPA를 직접 알면 안 된다. */
  @ArchTest
  static final ArchRule domainShouldNotDependOnRepository =
      noClasses()
          .that()
          .resideInAPackage("..domain..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("..repository..");

  /** Service 외 객체는 Repository를 모른다 → controller/domain은 repository 의존 금지. */
  @ArchTest
  static final ArchRule onlyServiceMayUseRepository =
      classes()
          .that()
          .resideInAPackage("..repository..")
          .should()
          .onlyHaveDependentClassesThat()
          .resideInAnyPackage("..service..", "..repository..", "..config..");

  /** Controller는 Repository를 직접 호출하지 않는다 (위임만). */
  @ArchTest
  static final ArchRule controllerShouldNotAccessRepository =
      noClasses()
          .that()
          .resideInAPackage("..controller..")
          .should()
          .dependOnClassesThat()
          .resideInAPackage("..repository..");

  /** 도메인은 프레임워크(스프링 웹)에 의존하지 않는다 → 순수성 보호. */
  @ArchTest
  static final ArchRule domainShouldBeFrameworkFree =
      noClasses()
          .that()
          .resideInAPackage("..domain..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("org.springframework.web..", "jakarta.servlet..");
}
