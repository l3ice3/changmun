package com.example.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * 계층 규칙 자동 검사 (A그룹 중 구조 규칙).
 * 근거: docs/rules/rules-full.md §6 계층
 *
 * 패키지 구조 전제:
 *   ..controller.. / ..service.. / ..domain.. / ..repository..
 * 프로젝트 실제 패키지명에 맞게 패키지 경로만 바꿔 쓴다.
 */
@AnalyzeClasses(
        packages = "com.example",
        importOptions = ImportOption.DoNotIncludeTests.class
)
public class ArchitectureTest {

    /** 도메인은 Repository 인터페이스 너머만 의존한다 → 도메인이 repository 구현/JPA를 직접 알면 안 된다. */
    @ArchTest
    static final ArchRule domainShouldNotDependOnRepository =
            noClasses().that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat().resideInAnyPackage("..repository..");

    /** Service 외 객체는 Repository를 모른다 → controller/domain은 repository 의존 금지. */
    @ArchTest
    static final ArchRule onlyServiceMayUseRepository =
            classes().that().resideInAPackage("..repository..")
                    .should().onlyHaveDependentClassesThat()
                    .resideInAnyPackage("..service..", "..repository..", "..config..");

    /** Controller는 Repository를 직접 호출하지 않는다 (위임만). */
    @ArchTest
    static final ArchRule controllerShouldNotAccessRepository =
            noClasses().that().resideInAPackage("..controller..")
                    .should().dependOnClassesThat().resideInAPackage("..repository..");

    /** 도메인은 프레임워크(스프링 웹)에 의존하지 않는다 → 순수성 보호. */
    @ArchTest
    static final ArchRule domainShouldBeFrameworkFree =
            noClasses().that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("org.springframework.web..", "jakarta.servlet..");
}
