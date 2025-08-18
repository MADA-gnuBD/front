// lib/ai-api.ts
const BASE = process.env.NEXT_PUBLIC_SPRING_API_URL!;

type Json = Record<string, any>;

async function postJson<T = any>(url: string, body: Json): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const reason = `${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`;
    const err: any = new Error(reason);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    return text as any;
  }
}

export const AIApi = {
  // 단일 정류소 예측
  predict(body: { stationId: string; minutes: number; supply: number }) {
    return postJson(`${BASE}/api/ai/predict`, body);
  },

  // 반경 예측 + 재배치 계획(Express에서 같은 핸들러 사용)
  rangePredict(body: { lat: number; lng: number; radius: number; minutes: number }) {
    return postJson(`${BASE}/api/ai/range-predict`, body);
  },

  // 선택: 같은 결과를 이 경로로도 받을 수 있음
  rebalancePlan(body: {
    center: { lat: number; lon: number };
    radius: number;
    minutes: number;
    station_id?: string;
  }) {
    return postJson(`${BASE}/api/ai/rebalance-plan`, body);
  },
};
