# VeloNext - 서울시 공공자전거 실시간 관리 시스템

![VeloNext Logo](https://img.shields.io/badge/VeloNext-공공자전거%20관리%20시스템-blue?style=for-the-badge)

## 📖 프로젝트 개요

VeloNext는 서울시 공공자전거(따릉이)의 실시간 현황을 모니터링하고 효율적으로 관리할 수 있는 웹 기반 플랫폼입니다. 관리자와 일반 사용자 모두를 위한 직관적인 인터페이스를 제공하며, AI 기반 예측 기능과 재배치 계획을 통해 자전거 대여소의 운영 효율성을 극대화합니다.

## ✨ 주요 기능

### 🗺️ 실시간 지도 및 모니터링
- **카카오맵 기반 실시간 지도**: 서울시 전체 자전거 대여소 현황을 시각적으로 표시
- **실시간 데이터 업데이트**: 1분마다 자동으로 대여소 정보 갱신
- **스마트 마커 시스템**: 자전거 재고 상태에 따른 색상 구분 마커
  - 🟢 정상(충분): 4대 이상
  - 🟡 재고 부족: 3대 이하
  - 🔴 빈 대여소: 0대
  - 🟣 작업 완료: 관리자 작업 완료 표시

### 🎯 관리자 기능
- **우선순위 대여소 관리**: 재고 부족 대여소 자동 감지 및 작업 큐 관리
- **작업 진행 상황 추적**: 대기중, 진행중, 완료 상태 실시간 모니터링
- **AI 기반 예측**: 60분 후 자전거 재고 예측 및 재배치 계획 수립
- **효율적인 작업 할당**: 지리적 위치 기반 최적 경로 제안

### 👥 커뮤니티 플랫폼
- **사용자 간 소통**: 자전거 대여소 관련 정보 공유 및 토론
- **실시간 알림**: 대여소 상태 변화 및 관리 작업 진행 상황 알림
- **사용자 피드백**: 대여소 이용 경험 및 개선 제안 수집

### 📊 데이터 분석 및 통계
- **종합 통계 대시보드**: 총 대여소 수, 이용 가능 자전거, 운영 중인 대여소 등
- **트렌드 분석**: 시간대별, 지역별 자전거 이용 패턴 분석
- **성과 지표**: 관리 작업 효율성 및 사용자 만족도 측정

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: React Context API
- **Maps**: Kakao Maps API

### Backend
- **Framework**: Spring Boot
- **Database**: MySQL/PostgreSQL
- **API**: RESTful API
- **Authentication**: JWT 기반 인증

### AI & Analytics
- **Machine Learning**: Python 기반 예측 모델
- **Data Processing**: 실시간 데이터 스트리밍
- **Optimization**: 자전거 재배치 최적화 알고리즘

## 🚀 설치 및 실행

### Prerequisites
- Node.js 18.0.0 이상
- npm 또는 yarn
- Spring Boot 개발 환경
- MySQL 또는 PostgreSQL 데이터베이스

### Frontend 설치
```bash
# 저장소 클론
git clone https://github.com/your-username/MADA_server.git
cd MADA_server/front

# 의존성 설치
npm install
# 또는
yarn install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 필요한 API 키 및 설정 입력

# 개발 서버 실행
npm run dev
# 또는
yarn dev
```

### 환경 변수 설정
```env
# .env.local
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_maps_api_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

### Backend 설정
```bash
# Spring Boot 프로젝트 디렉토리로 이동
cd ../backend

# Maven 의존성 설치
mvn install

# 애플리케이션 실행
mvn spring-boot:run
```

## 📱 사용법

### 일반 사용자
1. **메인 페이지 접속**: `/` 경로로 접속하여 실시간 지도 확인
2. **대여소 정보 조회**: 지도에서 마커 클릭하여 상세 정보 확인
3. **로그인**: 우측 상단 로그인 버튼을 통해 계정 생성 및 로그인
4. **커뮤니티 참여**: 로그인 후 커뮤니티 기능 이용

### 관리자
1. **관리자 계정으로 로그인**: `/admin` 경로로 접속
2. **우선순위 대여소 확인**: 자동으로 감지된 재고 부족 대여소 목록 확인
3. **작업 할당**: 필요한 대여소를 작업 큐에 추가
4. **작업 진행**: 실제 현장 작업 후 완료 처리
5. **AI 예측 확인**: 60분 후 예상 재고 및 재배치 계획 검토

## 🔧 개발 가이드

### 프로젝트 구조
```
front/
├── app/                    # Next.js App Router
│   ├── admin/             # 관리자 페이지
│   ├── auth/              # 인증 페이지
│   ├── community/         # 커뮤니티 페이지
│   ├── stations/          # 대여소 목록 페이지
│   └── layout.tsx         # 루트 레이아웃
├── components/            # 재사용 가능한 컴포넌트
│   ├── ui/               # 기본 UI 컴포넌트
│   ├── kakao-map.tsx     # 카카오맵 컴포넌트
│   ├── admin-panel.tsx   # 관리자 패널
│   └── ...
├── lib/                  # 유틸리티 및 타입 정의
├── api/                  # API 클라이언트
└── contexts/             # React Context
```

### 컴포넌트 개발 가이드
- **TypeScript 사용**: 모든 컴포넌트에 타입 정의 필수
- **Responsive Design**: 모바일과 데스크톱 모두 지원
- **Accessibility**: 웹 접근성 가이드라인 준수
- **Performance**: React.memo, useMemo, useCallback 적절히 활용

### API 통신
- **RESTful API**: 표준 HTTP 메서드 사용
- **Error Handling**: 일관된 에러 처리 및 사용자 피드백
- **Loading States**: 모든 비동기 작업에 로딩 상태 표시

## 🤝 기여하기

1. **Fork**: 프로젝트를 포크합니다
2. **Feature Branch**: 새로운 기능을 위한 브랜치를 생성합니다
3. **Commit**: 명확한 커밋 메시지와 함께 변경사항을 커밋합니다
4. **Push**: 브랜치를 원격 저장소에 푸시합니다
5. **Pull Request**: 메인 브랜치로 Pull Request를 생성합니다

### 코딩 컨벤션
- **ESLint & Prettier**: 코드 스타일 자동 포맷팅
- **TypeScript**: 엄격한 타입 체크
- **Component Naming**: PascalCase 사용
- **File Naming**: kebab-case 사용

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 문의 및 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/MADA_server/issues)
- **기능 제안**: [GitHub Discussions](https://github.com/your-username/MADA_server/discussions)
- **이메일**: support@velonext.com

## 🙏 감사의 말

- 서울시 공공자전거 서비스 제공
- 카카오맵 API 지원
- 오픈소스 커뮤니티 기여자들

---

**VeloNext** - 서울시 공공자전거의 미래를 만들어갑니다 🚴‍♂️✨
