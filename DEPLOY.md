# 배포 가이드

## Docker를 사용한 배포

### 1. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_SPRING_API_URL=http://43.201.61.111:8080
```

### 2. Docker 이미지 빌드 및 실행

#### 방법 1: Docker Compose 사용 (권장)
```bash
# 이미지 빌드 및 컨테이너 실행
docker-compose up --build

# 백그라운드에서 실행
docker-compose up -d --build
```

#### 방법 2: Docker 명령어 직접 사용
```bash
# 이미지 빌드
docker build -t seoul-bike-frontend .

# 컨테이너 실행
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SPRING_API_URL=http://43.201.61.111:8080 \
  seoul-bike-frontend
```

### 3. Docker Hub 배포 (선택사항)

#### Docker Hub 리포지토리 생성
1. [Docker Hub](https://hub.docker.com)에서 계정 생성
2. "Create Repository" 클릭
3. Repository name: `seoul-bike-frontend`
4. Visibility 선택 (Public/Private)

#### 이미지 빌드 및 푸시
```bash
# Docker Hub 로그인
docker login

# 이미지 빌드 (Docker Hub 사용자명으로 태그)
docker build -t [your-dockerhub-username]/seoul-bike-frontend:latest .

# 이미지 푸시
docker push [your-dockerhub-username]/seoul-bike-frontend:latest

# 다른 서버에서 실행
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SPRING_API_URL=http://43.201.61.111:8080 \
  [your-dockerhub-username]/seoul-bike-frontend:latest
```

### 4. GitHub Actions를 통한 자동 배포

#### 워크플로우 파일 선택
두 가지 워크플로우 파일이 제공됩니다:

1. **`.github/workflows/docker-compose.yml`**: Docker Compose 기반 배포
   - ✅ Docker Compose 빌드 및 테스트
   - ✅ 로컬 환경에서 컨테이너 테스트
   - ✅ Docker Hub 이미지 푸시
   - ✅ 서버에 Docker Compose로 배포
   - ✅ 헬스체크 및 상태 모니터링

2. **`.github/workflows/frontend.yml`**: 일반 Docker 기반 배포
   - ✅ 표준 Docker 빌드 및 푸시
   - ✅ 메타데이터 자동 태깅
   - ✅ 캐시 최적화
   - ✅ 보안 스캔

#### 사용 권장사항:
- **Docker Compose 워크플로우**: 복잡한 환경 설정이나 멀티 컨테이너가 필요한 경우
- **일반 Docker 워크플로우**: 단순한 단일 컨테이너 배포가 필요한 경우

### 5. 배포 확인
- 브라우저에서 `http://localhost:3000` 접속
- 또는 서버 IP: `http://[서버IP]:3000`

### 6. 컨테이너 관리

```bash
# 실행 중인 컨테이너 확인
docker-compose ps

# 컨테이너 중지
docker-compose down

# 로그 확인
docker-compose logs -f

# 컨테이너 재시작
docker-compose restart

# 컨테이너 재빌드
docker-compose up --build -d
```

### 7. 프로덕션 배포 시 주의사항

1. **환경 변수**: 프로덕션에서는 환경 변수를 통해 API URL을 설정하세요
2. **포트**: 필요에 따라 포트를 변경할 수 있습니다
3. **HTTPS**: 프로덕션에서는 HTTPS를 사용하는 것을 권장합니다
4. **로드 밸런서**: 트래픽이 많을 경우 로드 밸런서 사용을 고려하세요

### 8. 문제 해결

#### 빌드 오류가 발생하는 경우:
```bash
# 캐시 없이 다시 빌드
docker-compose build --no-cache

# 또는 Docker 명령어로
docker build --no-cache -t seoul-bike-frontend .
```

#### 컨테이너가 시작되지 않는 경우:
```bash
# 로그 확인
docker-compose logs

# 컨테이너 상태 확인
docker-compose ps -a

# 컨테이너 재시작
docker-compose down && docker-compose up -d
```

#### 포트 충돌이 발생하는 경우:
`docker-compose.yml`에서 포트를 변경하세요:
```yaml
ports:
  - "3001:3000"  # 호스트의 3001 포트를 컨테이너의 3000 포트에 매핑
```

### 9. Docker Compose vs 일반 Docker

| 기능 | Docker Compose | 일반 Docker |
|------|----------------|-------------|
| **복잡성** | 간단한 명령어 | 수동 설정 필요 |
| **환경 변수** | 자동 관리 | 수동 설정 |
| **네트워킹** | 자동 설정 | 수동 설정 |
| **볼륨** | 자동 관리 | 수동 설정 |
| **멀티 컨테이너** | 쉬운 관리 | 복잡한 관리 |

### 10. GitHub Actions 워크플로우 선택 가이드

#### Docker Compose 워크플로우 사용 시:
- ✅ 더 간단한 배포 프로세스
- ✅ 환경 변수 자동 관리
- ✅ 로컬 테스트 포함
- ✅ 헬스체크 자동화
- ✅ 멀티 컨테이너 환경

#### 일반 Docker 워크플로우 사용 시:
- ✅ 더 세밀한 제어
- ✅ 커스텀 빌드 프로세스
- ✅ 복잡한 배포 시나리오
- ✅ 메타데이터 자동 태깅
- ✅ 캐시 최적화

### 11. 워크플로우 파일 구성

#### Docker Compose 워크플로우 (`.github/workflows/docker-compose.yml`):
```yaml
jobs:
  - test-and-build          # 테스트 및 빌드
  - docker-compose-build    # Docker Compose 빌드
  - docker-compose-deploy   # Docker Compose 배포
  - deploy-with-compose     # 서버 배포
  - security-scan          # 보안 스캔
  - notify                 # 알림
```

#### 일반 Docker 워크플로우 (`.github/workflows/frontend.yml`):
```yaml
jobs:
  - test-and-build         # 테스트 및 빌드
  - docker-build-and-push  # Docker 빌드 및 푸시
  - deploy                 # 서버 배포
  - security-scan         # 보안 스캔
  - notify                # 알림
```
