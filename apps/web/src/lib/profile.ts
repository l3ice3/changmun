// 프로필 이미지 — 업로드(1MB·이미지 형식 제한)/삭제. 서버(api /users/me/profile-image)와 이중 검증.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";

export const MAX_PROFILE_IMAGE_BYTES = 1_048_576; // 1MB — 서버 한도와 동일
export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 업로드/삭제 성공 시 모든 Avatar 인스턴스(헤더 포함)가 재조회하도록 쏘는 전역 이벤트.
export const PROFILE_IMAGE_UPDATED_EVENT = "changmun:profile-image-updated";

function notifyProfileImageUpdated(): void {
  window.dispatchEvent(new Event(PROFILE_IMAGE_UPDATED_EVENT));
}

export function profileImageUrl(version: number): string {
  // 캐시 버스터 — 업로드/삭제 직후 브라우저 캐시가 이전 이미지를 보여주지 않게.
  return `${API_BASE}/users/me/profile-image?v=${version}`;
}

/** 업로드 전 클라이언트 검증 — 통과 못 하면 안내 메시지 반환, 통과면 null. */
export function validateProfileImage(file: File): string | null {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
    return "JPEG·PNG·WebP 이미지만 업로드 가능합니다.";
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return "프로필 이미지는 1MB 이하만 업로드 가능합니다.";
  }
  return null;
}

export async function uploadProfileImage(file: File): Promise<void> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(profileImageUrl(0), {
    method: "PUT",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
  notifyProfileImageUpdated();
}

export async function removeProfileImage(): Promise<void> {
  const res = await fetch(profileImageUrl(0), { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    throw new Error("기본 이미지로 되돌리지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  notifyProfileImageUpdated();
}
