package com.changmun.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.changmun.common.web.InvalidParameterException;
import com.changmun.common.web.NotFoundException;
import com.changmun.user.domain.AppUser;
import com.changmun.user.dto.ProfileImageResponse;
import com.changmun.user.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 프로필 이미지 서비스 — 저장·조회·삭제 + 1MB/형식 검증. 실 PostgreSQL(Testcontainers). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
@Import(ProfileImageService.class)
class ProfileImageServiceTest {

  private static final int MAX_IMAGE_BYTES = 1_048_576;

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private ProfileImageService service;
  @Autowired private AppUserRepository userRepository;

  private Long userId;

  @BeforeEach
  void setUp() {
    userId = userRepository.save(AppUser.of("google", "u-profile", "p@example.com")).getId();
  }

  @Test
  @DisplayName("업로드 후 조회하면 저장한 바이트와 형식이 그대로 나온다")
  void updateThenFind() {
    byte[] image = new byte[] {1, 2, 3};

    service.update(userId, image, "image/png");
    ProfileImageResponse row = service.find(userId);

    assertThat(row.image()).isEqualTo(image);
    assertThat(row.contentType()).isEqualTo("image/png");
  }

  @Test
  @DisplayName("이미지가 없으면 조회는 NotFound다")
  void findWithoutImageThrowsNotFound() {
    assertThatThrownBy(() -> service.find(userId)).isInstanceOf(NotFoundException.class);
  }

  @Test
  @DisplayName("1MB를 초과하면 업로드가 거부된다")
  void updateRejectsOversizedImage() {
    byte[] oversized = new byte[MAX_IMAGE_BYTES + 1];

    assertThatThrownBy(() -> service.update(userId, oversized, "image/png"))
        .isInstanceOf(InvalidParameterException.class);
  }

  @Test
  @DisplayName("이미지 형식이 아니면 업로드가 거부된다")
  void updateRejectsUnsupportedType() {
    assertThatThrownBy(() -> service.update(userId, new byte[] {1}, "application/pdf"))
        .isInstanceOf(InvalidParameterException.class);
  }

  @Test
  @DisplayName("삭제하면 기본 상태(이미지 없음)로 돌아간다")
  void removeClearsImage() {
    service.update(userId, new byte[] {1, 2, 3}, "image/jpeg");

    service.remove(userId);

    assertThatThrownBy(() -> service.find(userId)).isInstanceOf(NotFoundException.class);
  }
}
