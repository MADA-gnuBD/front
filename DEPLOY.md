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

### 3. 배포 확인
- 브라우저에서 `http://localhost:3000` 접속
- 또는 서버 IP: `http://[서버IP]:3000`

### 4. 컨테이너 관리

```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 중지
docker-compose down

# 로그 확인
docker-compose logs -f

# 컨테이너 재시작
docker-compose restart
```

### 5. 프로덕션 배포 시 주의사항

1. **환경 변수**: 프로덕션에서는 환경 변수를 통해 API URL을 설정하세요
2. **포트**: 필요에 따라 포트를 변경할 수 있습니다
3. **HTTPS**: 프로덕션에서는 HTTPS를 사용하는 것을 권장합니다
4. **로드 밸런서**: 트래픽이 많을 경우 로드 밸런서 사용을 고려하세요

### 6. 문제 해결

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
docker ps -a
```

#### 포트 충돌이 발생하는 경우:
`docker-compose.yml`에서 포트를 변경하세요:
```yaml
ports:
  - "3001:3000"  # 호스트의 3001 포트를 컨테이너의 3000 포트에 매핑
```
