# 배포 문서 (Deployment)

창문(changmun) 프로덕션 배포 구성·절차·운영 정리. **동료 공유용.**

> ⚠️ **이 레포는 public이다.** 실제 IP·SSH 키·비밀번호·OAuth 시크릿·S3 버킷 등 민감값은 이 문서에 적지 않는다. 그런 값은 **팀 비공개 노트/1Password 등**에서 관리한다. 여기엔 구조와 절차만.

---

## 1. 아키텍처 — 하이브리드

web은 Vercel, api+DB는 EC2 한 대. RDS·ALB 없이 비용 최소화(MVP).

```
사용자
  │
  ├── www.changmun.com ─────────────► Vercel (Next.js SSG/ISR, 프론트)
  │                                        │  브라우저가 API 호출
  │                                        ▼
  └── api.changmun.com ─────────────► AWS EC2 (t4g.small, ARM, Ubuntu)
                                           │
                                     ┌─────┴──────────────────────┐
                                     │ Docker Compose             │
                                     │  ├ caddy   (80/443, HTTPS) │
                                     │  ├ api     (Spring Boot)   │
                                     │  └ postgres(DB, 볼륨 영속) │
                                     └────────────────────────────┘
```

| 구성 | 위치 | 도메인 | 비고 |
|---|---|---|---|
| web | Vercel | `www.changmun.com` | Next.js. git push→main 시 **자동 배포** |
| api | EC2 Docker | `api.changmun.com` | Spring Boot. push→main **자동배포**(CI/CD §5) |
| DB | EC2 Docker | (외부 미노출) | Postgres 16. 컨테이너 내부, Caddy/호스트로 노출 안 함 |
| 도메인·DNS | Cloudflare | `changmun.com` | 레지스트라 겸 DNS |

---

## 2. 도메인 · DNS (Cloudflare)

`changmun.com`을 Cloudflare에서 구매·관리. 주요 레코드:

| 이름 | 타입 | 값 | Proxy | 용도 |
|---|---|---|---|---|
| `www` | CNAME | Vercel 대상 | DNS only | web |
| `api` | A | EC2 퍼블릭 IP | DNS only | api (Caddy 인증서 발급 위해 반드시 **DNS only/회색구름**) |

- **api의 A레코드는 반드시 "DNS only"(회색 구름).** Proxy(주황)면 Caddy의 Let's Encrypt 발급/HTTP-01 검증이 막힐 수 있다.
- 자동 갱신 켜둠(도메인 만료 방지).

---

## 3. web — Vercel

- **프레임워크 프리셋: Next.js** (Other로 잡히면 `No Output Directory named public` 빌드 실패 → Settings에서 Next.js로 지정).
- **자동 배포**: GitHub 레포 연동. main에 push/머지되면 Vercel이 자동 빌드·배포.
- **커스텀 도메인**: `www.changmun.com` 연결.
- **환경변수(Vercel Project Settings → Environment Variables)**:
  - `NEXT_PUBLIC_API_BASE = https://api.changmun.com/api/v1` (web이 데이터 가져올 API)
  - `NEXT_PUBLIC_SITE_URL = https://www.changmun.com` (SEO canonical/OG/sitemap 기준 URL)
- 레포 public 전환: Vercel 무료(Hobby)로 조직 레포 배포 시 Pro 요구 → **public 전환으로 우회**(git 히스토리에 시크릿 0 확인 후).

---

## 4. api + DB — EC2 (Docker Compose)

EC2 한 대에서 `caddy` + `api` + `postgres`를 compose로 함께 띄운다.

### 구성 파일 (이 `deploy/` 폴더)
| 파일 | 역할 |
|---|---|
| `docker-compose.prod.yml` | postgres·api·caddy 3 서비스 정의 |
| `Caddyfile` | `api.changmun.com` → `api:8080` 리버스 프록시 + 자동 HTTPS |
| `.env.example` | 시크릿 템플릿(→ `.env`로 복사해 값 채움, **커밋 금지**) |

### 핵심 포인트
- **api 이미지**: `apps/api/Dockerfile` (멀티스테이지, 빌드 컨텍스트 = **레포 루트** — `db/migrations` 포함 위함). Flyway가 기동 시 스키마 적용(`ddl-auto=validate` 고정).
- **DB 주소는 컨테이너 서비스명** `postgres:5432` (localhost 아님).
- **Postgres 데이터는 `pgdata` 볼륨에 영속** — 컨테이너 재생성해도 데이터 유지.
- **Caddy만 80/443 노출**, api(8080)·postgres는 호스트 미노출(`expose`만).
- **`SERVER_FORWARD_HEADERS_STRATEGY=framework`**: Caddy 프록시 뒤에서 https 인식 → OAuth 리다이렉트/Secure 쿠키 정상화.

### EC2 스펙
- 인스턴스: **t4g.small** (ARM/Graviton, 2 vCPU / **2GB RAM**). Ubuntu.
- 보안그룹: **22(SSH, 내 IP만 권장)** · **80·443(전체 개방 — Caddy 인증서·서비스)**.
- SSH 키(`.pem`): **git 커밋·공유 절대 금지.** 동료는 **각자 키를 authorized_keys에 추가**(개인키 공유 X).
- 예상 비용: 프리티어 만료 후 월 **~$18** 수준.

---

## 5. api 배포 (CI/CD — 자동)

**push→main 하면 자동 배포된다.** 흐름:
```
push→main (apps/api 또는 db/migrations 변경)
  → GitHub Actions(.github/workflows/deploy-api.yml): arm64 이미지 빌드 → GHCR push
  → EC2 cron(2분): git fetch+reset --hard(compose·Caddyfile 갱신) + docker compose pull + up -d  → 교체
```
- **빌드는 GitHub Actions에서**(프로덕션 EC2에서 빌드 X). EC2는 완성된 이미지를 pull만.
- 이미지: `ghcr.io/l3ice3/changmun-api:latest` (+ `:<커밋 sha>`). GHCR 패키지는 **public**(EC2가 인증 없이 pull).
- EC2 배포 스크립트: `~/deploy.sh`, cron `*/2 * * * *`, 로그 `~/deploy.log`.
  - `~/changmun`은 main의 git 클론. deploy.sh는 `git reset --hard origin/main`으로 강제 동기화(EC2에서 직접 수정 금지 — 덮어씀). `.env`는 gitignore라 보존.
  - 변경 없으면 조용히 종료(no-op) → 로그엔 **동기화·배포·에러만** 남는다(빈 로그 = 정상).

**롤백** (EC2에서):
```bash
cd ~/changmun/deploy
echo "API_IMAGE_TAG=<되돌릴 커밋 sha>" >> .env   # 기존 줄 있으면 교체
docker compose -f docker-compose.prod.yml pull api && docker compose -f docker-compose.prod.yml up -d api
# 복귀: .env에서 API_IMAGE_TAG 제거(=latest) 후 위 명령 반복
```

**수동 강제 재배포** (급할 때, cron 안 기다리고):
```bash
ssh -i <changmun-key.pem> ubuntu@<EC2-IP>   # 키·IP는 팀 비공개 노트
~/deploy.sh                                  # git fetch+reset + 이미지 pull + up -d
```

- **`.env`의 OAUTH_* 8개는 하나라도 비면 api 기동 실패**(Spring이 빈 client-id 거부). 4개 provider 값 전부 채울 것.
- Actions 빌드 상태는 GitHub → Actions 탭에서 확인.

---

## 6. ingest — 데이터 수집 배치

- 이미지: `apps/ingest/Dockerfile` (Python 3.11 + poetry). 공식 API 3종 수집→정규화→dedup→페르소나.
- 현재 프로덕션 DB는 **수동 1회 실행으로 채움**(약 29,651건). 일 1회 자동 스케줄(EC2 cron)은 아직 없음.
- 실행 예:
  ```bash
  docker build -f apps/ingest/Dockerfile -t changmun-ingest apps/ingest
  docker run --rm --network deploy_default \
    -e DATABASE_URL=postgresql://changmun:<pw>@postgres:5432/changmun \
    -e KSTARTUP_API_KEY=... -e ONTONG_API_KEY=... \
    changmun-ingest
  ```

---

## 7. 공고 데이터 용량 (이 스펙으로 얼마나 담나)

**결론: 저장 용량은 병목이 아니다.** 실제 병목은 디스크가 아니라 **2GB RAM**(동시 조회 성능)이다.

### 실측 기준점
| 항목 | 값 |
|---|---|
| 현재 적재 | **29,651건** |
| 압축 백업(gzip pg_dump) | **약 11MB** |
| 디스크 실사용 추정 | 약 **150~250MB** (건당 대략 5~8KB) |

> 디스크 실사용이 압축 백업의 수 배인 이유: `raw` JSONB 원본 보존 + **pg_trgm 검색 인덱스(GIN)** + btree 인덱스 + row 오버헤드. gzip은 텍스트/JSON을 크게 줄이므로 압축본↔실사용 격차가 크다.

### 스케일 추정 (건당 ~6KB, 인덱스 포함 가정)
| 공고 건수 | DB 디스크 사용(추정) |
|---|---|
| 3만 (현재) | ~0.2GB |
| 10만 | ~0.6GB |
| 50만 | ~3GB |
| 100만 | ~6GB |

- **판단**: EBS 디스크가 8GB만 돼도 DB 순수 데이터로 **수십만~100만 건**을 담는다. 그런데 **정부 창업 공고의 유효 모집단은 상시 수만 건 규모**(마감 지난 이력 누적을 감안해도 수십만 건대)라, **용량은 한참 여유**다.
- **실제 남는 공간 = EBS 크기 − (OS + Docker 이미지 + Postgres 오버헤드 + 로컬 백업 7일치)**. 백업이 로컬에도 쌓이니(§8) 디스크의 일부는 백업이 차지한다.
- **진짜 제약은 RAM(2GB)**: Postgres + Spring api + Caddy가 한 대에서 메모리를 나눠 쓴다. 데이터가 커지면 용량보다 **인덱스 캐시 히트율·동시 쿼리 성능**이 먼저 압박받는다. 그 시점이 오면 RDS/인스턴스 상향 검토(현재 MVP엔 불필요).

### 실제 값 확인법 (EC2에서)
```bash
df -h                                        # EBS 남은 용량
docker exec changmun-postgres psql -U changmun -d changmun \
  -c "SELECT pg_size_pretty(pg_database_size('changmun'));"   # DB 실사용
docker exec changmun-postgres psql -U changmun -d changmun \
  -c "SELECT count(*) FROM opportunity;"     # 적재 건수
```

---

## 8. DB 백업

EC2 cron으로 매일 백업. **로컬 7일 + S3 30일(lifecycle).**

- 스크립트: `~/db-backup.sh` (EC2 홈, 레포에는 없음):
  - `pg_dump | gzip` → 로컬 저장
  - `find ... -mtime +7 -delete` (로컬 7일 회전)
  - `aws s3 cp` → S3 업로드 (S3는 lifecycle 30일)
- cron: `0 18 * * *` (UTC 18:00 = **KST 03:00**) 매일.
- S3 접근: **EC2 인스턴스 IAM 역할**(키 하드코딩 X).
- 복구: `gunzip -c 백업.sql.gz | docker exec -i changmun-postgres psql -U changmun -d changmun`

---

## 9. 비밀·환경변수 관리

**레포·코드에 절대 커밋 금지** (레포 public):

| 종류 | 어디에 |
|---|---|
| OAuth ID/Secret (4 provider ×2) | EC2 `deploy/.env` |
| Postgres 비밀번호 | EC2 `deploy/.env` |
| 수집 API 키(K-Startup·기업마당·온통청년) | 실행 시 env 주입 |
| SSH `.pem` | 각자 로컬(공유 금지) |
| AWS 자격 | EC2 **IAM 역할**(키 파일 X) |

- GitHub OAuth는 **콜백 URL 1개 제한** → 로컬용/프로덕션용 **앱을 분리**해 등록. 프로덕션 redirect URI: `https://api.changmun.com/login/oauth2/code/github`.
