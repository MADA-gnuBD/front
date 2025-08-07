# GitHub Actions Secrets 설정 가이드

## 필요한 Secrets 설정

GitHub Actions가 정상적으로 작동하려면 다음 Secrets를 설정해야 합니다.

### 1. GitHub Repository Settings에서 Secrets 설정

1. GitHub 저장소로 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Secrets and variables** → **Actions** 클릭
4. **New repository secret** 버튼 클릭

### 2. 필수 Secrets

#### `NEXT_PUBLIC_SPRING_API_URL`
- **설명**: Spring 백엔드 API URL
- **값**: `http://43.201.61.111:8080`
- **용도**: 빌드 시 환경 변수로 사용

#### `DOCKERHUB_USERNAME`
- **설명**: Docker Hub 사용자명
- **값**: `your-dockerhub-username`
- **용도**: Docker Hub 로그인

#### `DOCKERHUB_TOKEN`
- **설명**: Docker Hub 액세스 토큰
- **생성 방법**:
  1. [Docker Hub](https://hub.docker.com) 로그인
  2. **Account Settings** → **Security**
  3. **New Access Token** 클릭
  4. 토큰 생성 후 복사
- **용도**: Docker Hub에 이미지 푸시

### 3. 선택적 Secrets (서버 배포 시)

#### `SERVER_HOST`
- **설명**: 배포할 서버 IP 주소
- **값**: `your-server-ip`
- **용도**: SSH 연결

#### `SERVER_USERNAME`
- **설명**: 서버 사용자명
- **값**: `ubuntu` 또는 `root`
- **용도**: SSH 연결

#### `SERVER_SSH_KEY`
- **설명**: 서버 SSH 개인키
- **생성 방법**:
  ```bash
  # SSH 키 생성
  ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
  
  # 공개키를 서버에 등록
  ssh-copy-id username@your-server-ip
  
  # 개인키 내용 복사 (GitHub Secret에 등록)
  cat ~/.ssh/id_rsa
  ```
- **용도**: 서버에 안전한 SSH 연결

## Secrets 설정 예시

### 기본 설정 (Docker Hub만 사용)
```
NEXT_PUBLIC_SPRING_API_URL=http://43.201.61.111:8080
DOCKERHUB_USERNAME=your-username
DOCKERHUB_TOKEN=your-dockerhub-token
```

### 완전한 설정 (서버 배포 포함)
```
NEXT_PUBLIC_SPRING_API_URL=http://43.201.61.111:8080
DOCKERHUB_USERNAME=your-username
DOCKERHUB_TOKEN=your-dockerhub-token
SERVER_HOST=your-server-ip
SERVER_USERNAME=ubuntu
SERVER_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

## 워크플로우 동작

### 1. 코드 푸시 시
- ✅ 의존성 설치
- ✅ 린팅 및 타입 체크
- ✅ 애플리케이션 빌드
- ✅ Docker 이미지 빌드 및 푸시
- ✅ 보안 스캔
- ✅ 서버 배포 (설정된 경우)

### 2. Pull Request 시
- ✅ 의존성 설치
- ✅ 린팅 및 타입 체크
- ✅ 애플리케이션 빌드
- ✅ 보안 스캔

## 문제 해결

### 빌드 실패 시
1. **Secrets 확인**: 모든 필수 Secrets가 설정되었는지 확인
2. **Docker Hub 토큰**: 토큰이 유효한지 확인
3. **SSH 키**: 서버 배포 시 SSH 키 형식 확인

### 로그 확인
1. GitHub 저장소 → **Actions** 탭
2. 실패한 워크플로우 클릭
3. 실패한 Job 클릭하여 상세 로그 확인

## 보안 주의사항

- ✅ Secrets는 암호화되어 저장됩니다
- ✅ 로그에서 Secrets 값이 노출되지 않습니다
- ❌ Secrets를 코드에 직접 입력하지 마세요
- ❌ SSH 키를 Git에 커밋하지 마세요
