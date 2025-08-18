// api/authAPI.ts
type Json = Record<string, any>;

const getBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SPRING_API_URL || "http://localhost:8080";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

// 공통 요청 도우미: 2xx 성공, 에러는 JSON/텍스트 안전 파싱
async function request<T = any>(
  path: string,
  opts: { method?: string; body?: Json; token?: string } = {}
): Promise<T> {
  const { method = "GET", body, token } = opts;
  const url = `${getBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    let msg = "";
    try {
      msg = (text && JSON.parse(text)?.error) || "";
    } catch {}
    if (res.status === 409) msg ||= "이미 가입된 이메일입니다.";
    if (res.status === 401) msg ||= "인증이 필요합니다.";
    if (res.status === 403) msg ||= "접근 권한이 없습니다.";
    const err: any = new Error(msg || `${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// 빈 값/불필요 값 제거 유틸
const sanitize = (obj: Json) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && String(v).trim() !== ""
    )
  );

const AuthAPI = {
  // 로그인
  login(email: string, password: string) {
    return request("/api/users/login", {
      method: "POST",
      body: { email, password },
    });
  },

  // 회원가입
  register(email: string, password: string, name: string) {
    return request("/api/users/signup", {
      method: "POST",
      body: { email, password, name },
    });
  },

  // 프로필 업데이트
  updateProfile(
    data: { name: string; email: string; currentPassword?: string; newPassword?: string },
    token: string
  ) {
    // ✅ 빈 필드 걷어내고 전송
    const payload = sanitize(data);
    return request("/api/users/me", { method: "PUT", body: payload, token });
  },

  // 계정 삭제
  deleteAccount(token: string) {
    return request("/api/users/me", { method: "DELETE", token });
  },

  // 토큰 갱신
  refreshToken(refreshToken: string) {
    return request("/api/users/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },

  // 내 정보
  getMe(token: string) {
    return request("/api/users/me", { token });
  },
};

export default AuthAPI;
