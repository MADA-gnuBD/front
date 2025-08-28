"use client";

import { useEffect, useRef, useState } from "react";
import type { BikeStation } from "@/lib/bike-api";

declare global {
  interface Window {
    kakao: any;
    __kakaoLoaderPromise?: Promise<any>;
  }
}

interface KakaoMapProps {
  stations: BikeStation[];
  onStationClick: (station: BikeStation) => void;
  selectedStation: BikeStation | null;
  userLocation: { lat: number; lng: number } | null;
  priorityStations?: BikeStation[];
  completedStations?: Set<string>;
  workQueue?: string[];
  predictedByStation?: Record<string, number>;

  /** 🔹 추가: 재배치 경로 */
  rebalancingPlan?: Array<{ from: string; to: string; moveCount?: number }>;
  /** 🔹 추가: 경로 표시 여부 */
  showPaths?: boolean;
}

const markerLegend = [
  { color: "#22C55E", label: "정상(충분)" },
  { color: "#F59E0B", label: "재고 부족(3대 이하) / 작업 대기" },
  { color: "#8B5CF6", label: "작업 완료" },
  { color: "#EF4444", label: "빈 대여소(0대)" },
];

// "ST-01234" -> "1234"
const normId = (v: string | number | undefined | null) =>
  String(v ?? "").replace(/^ST-/, "").replace(/^0+/, "").trim();

// ✅ SDK 로더 (재시도 포함)
function loadKakaoMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (window.__kakaoLoaderPromise) return window.__kakaoLoaderPromise;

  window.__kakaoLoaderPromise = new Promise((resolve, reject) => {
    const id = "kakao-map-sdk";

    const waitForLatLng = (maxTries = 10, interval = 100) => {
      let tries = 0;
      const tick = () => {
        if (window.kakao?.maps?.LatLng) return resolve(window.kakao);
        if (++tries >= maxTries) return reject(new Error("kakao.maps.LatLng not ready after retries"));
        setTimeout(tick, interval);
      };
      tick();
    };

    const onReady = () => {
      try {
        // maps.load 자체가 DOMContentLoaded 이후 실행을 보장하지만,
        // 드물게 내부 객체가 늦게 붙는 경우가 있어 짧게 재확인
        window.kakao.maps.load(() => {
          waitForLatLng();
        });
      } catch (e) {
        reject(e);
      }
    };

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      // 이미 붙어있다면 load가 있는지/없는지에 따라 처리
      if (window.kakao?.maps?.load) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      return;
    }

    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appkey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY is missing"));
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    // 필요 라이브러리는 그대로 유지
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services,clusterer&autoload=false`;
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Kakao Maps SDK")), { once: true });
    document.head.appendChild(script);
  });

  return window.__kakaoLoaderPromise;
}


// ---------- 오버레이 배치 관련 상수 & 유틸 ----------
const OVERLAY_W = 240; // 오버레이 가로(px) 추정
const OVERLAY_H = 110; // 오버레이 세로(px) 추정
const MARGIN = 8; // 오버레이끼리 최소 간격
// bottom-center 기준의 후보 오프셋(px)들 (겹치면 다음 자리 시도)
const CANDIDATE_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: -12 }, // 바로 위
  { dx: 100, dy: -12 }, // 우측
  { dx: -100, dy: -12 }, // 좌측
  { dx: 0, dy: 12 }, // 아래
  { dx: 160, dy: -12 }, // 더 우측
  { dx: -160, dy: -12 }, // 더 좌측
  { dx: 100, dy: -90 }, // 우상
  { dx: -100, dy: -90 }, // 좌상
  { dx: 0, dy: -90 }, // 위로 멀리
  { dx: 180, dy: -90 }, // 우상 더 멀리
  { dx: -180, dy: -90 }, // 좌상 더 멀리
];

type Rect = { x: number; y: number; w: number; h: number };
const inflate = (r: Rect, by = MARGIN): Rect => ({
  x: r.x - by,
  y: r.y - by,
  w: r.w + 2 * by,
  h: r.h + 2 * by,
});
const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; // ✅ 오타 수정

export function KakaoMap({
  stations,
  onStationClick,
  selectedStation,
  userLocation,
  priorityStations = [],
  completedStations = new Set(),
  workQueue = [],
  predictedByStation = {},

  // 🔹 추가 props
  rebalancingPlan = [],
  showPaths = true,
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // 오버레이들
  const overlaysRef = useRef<
    Map<
      string,
      {
        overlay: any;
        anchor: any; // kakao.maps.LatLng
      }
    >
  >(new Map());

  // 🔹 경로(폴리라인) / 라벨 오버레이
  const polylinesRef = useRef<any[]>([]);
  const pathLabelsRef = useRef<any[]>([]);

  const [ready, setReady] = useState(false);

  // ---------- 오버레이 콘텐츠 ----------
  const createOverlayElement = (station: BikeStation) => {
    const key = normId(station.stationId);
    const predicted = predictedByStation[key];
    const hasPred = Number.isFinite(predicted);

    const now = station.parkingBikeTotCnt ?? 0; // 현재 보유
    const cap = (station as any).rackTotCnt ?? 0; // 거치대 수(없을 수도)

    // 예측값을 변화량(Δ)으로 해석 → 최종 재고 = 현재 + Δ
    const delta = hasPred ? Number(predicted) : 0;
    const finalStockRaw = hasPred ? now + delta : null;

    const finalStock =
      hasPred && finalStockRaw !== null
        ? Math.max(0, cap > 0 ? Math.min(finalStockRaw, cap) : finalStockRaw)
        : null;

    const deltaLabel =
      hasPred && delta !== 0 ? (delta > 0 ? `+${delta}` : `${delta}`) : `${delta}`;

    const el = document.createElement("div");
    el.style.pointerEvents = "auto";
    el.innerHTML = `
      <div style="
        background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);
        padding:10px 18px;min-width:${OVERLAY_W - 40}px;max-width:${OVERLAY_W}px;font-size:13px;color:#222;
        border:1px solid #d5d5d5;line-height:1.5;word-break:break-all;">
        <div style="font-weight:bold;margin-bottom:4px;">${station.stationName}</div>
        <div>자전거 <b>${now}대</b>${cap > 0 ? ` / 거치대 <b>${cap}대</b>` : ''}</div>
        ${
          hasPred
            ? `<div style="margin-top:6px;">
                 <b>예측(60분):</b> ${deltaLabel}대<br/>
                 <b>예상 재고:</b> ${finalStock ?? finalStockRaw}대
               </div>`
            : ""
        }
        <div style="margin-top:4px;font-size:11px;color:#666">이 오버레이를 더블클릭하면 닫힙니다</div>
      </div>
    `;
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      closeOverlay(station.stationId);
    });
    return el;
  };

  // ---------- 오버레이 열고/닫기 ----------
  const openOverlay = (station: BikeStation) => {
    if (!mapRef.current) return;
    const kakao = window.kakao;
    const id = station.stationId;

    const existed = overlaysRef.current.get(id);
    if (existed) {
      existed.overlay.setContent(createOverlayElement(station));
      layoutOverlays();
      return;
    }

    const anchor = new kakao.maps.LatLng(
      station.stationLatitude,
      station.stationLongitude
    );
    const overlay = new kakao.maps.CustomOverlay({
      position: anchor,
      content: createOverlayElement(station),
      yAnchor: 1.15,
      xAnchor: 0.5,
      zIndex: 25,
      clickable: true,
    });
    overlay.setMap(mapRef.current);
    overlaysRef.current.set(id, { overlay, anchor });

    layoutOverlays();
  };

  const closeOverlay = (stationId: string) => {
    const ov = overlaysRef.current.get(stationId);
    if (ov) {
      ov.overlay.setMap(null);
      overlaysRef.current.delete(stationId);
      layoutOverlays();
    }
  };

  // ---------- 오버레이 자동 배치 (겹침 방지) ----------
  const layoutOverlays = () => {
    if (!mapRef.current || overlaysRef.current.size === 0) return;
    const proj = mapRef.current.getProjection();

    const entries = Array.from(overlaysRef.current.entries()).map(([id, v]) => {
      const pt = proj.containerPointFromCoords(v.anchor);
      return { id, entry: v, ptY: pt.y, ptX: pt.x };
    });
    entries.sort((a, b) => a.ptY - b.ptY || a.ptX - b.ptX);

    const used: Rect[] = [];
    for (const { entry } of entries) {
      const basePt = proj.containerPointFromCoords(entry.anchor);

      let chosenPt = { x: basePt.x, y: basePt.y - 12 };
      for (const off of CANDIDATE_OFFSETS) {
        const candBottomCenter = { x: basePt.x + off.dx, y: basePt.y + off.dy };
        const rect: Rect = {
          x: Math.round(candBottomCenter.x - OVERLAY_W / 2),
          y: Math.round(candBottomCenter.y - OVERLAY_H),
          w: OVERLAY_W,
          h: OVERLAY_H,
        };
        const grown = inflate(rect, MARGIN);
        const conflict = used.some((r) => intersects(grown, r));
        if (!conflict) {
          chosenPt = candBottomCenter;
          used.push(grown);
          break;
        }
      }

      const chosenLatLng = proj.coordsFromContainerPoint(
        new window.kakao.maps.Point(chosenPt.x, chosenPt.y)
      );
      entry.overlay.setPosition(chosenLatLng);
    }
  };

  // ---------- 지도 생성 ----------
  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapContainer.current) return;
        const center = new kakao.maps.LatLng(37.5665, 126.978);
        mapRef.current = new kakao.maps.Map(mapContainer.current, {
          center,
          level: 3,
        });
        const idleHandler = () => layoutOverlays();
        kakao.maps.event.addListener(mapRef.current, "idle", idleHandler);

        setTimeout(() => {
          if (!cancelled) {
            mapRef.current?.relayout?.();
            mapRef.current?.setCenter(center);
            setReady(true);
          }
        }, 0);
      })
      .catch((err) => {
        console.error("[KakaoMap] SDK load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 리사이즈 대응
  useEffect(() => {
    if (!ready || !mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.relayout?.();
      layoutOverlays();
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [ready]);

  // ---------- 마커 렌더 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || stations.length === 0) return;
    const kakao = window.kakao;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    stations.forEach((station) => {
      const markerPosition = new kakao.maps.LatLng(
        station.stationLatitude,
        station.stationLongitude
      );

      let markerColor = "#22C55E";
      if (completedStations.has(station.stationId)) markerColor = "#8B5CF6";
      else if ((station.parkingBikeTotCnt ?? 0) === 0) markerColor = "#EF4444";
      else if (workQueue.includes(station.stationId) || (station.parkingBikeTotCnt ?? 0) <= 3)
        markerColor = "#F59E0B";

      const svg = `
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="${markerColor}" stroke="white" stroke-width="3"/>
</svg>`;
      const imageSrc = `data:image/svg+xml;base64,${btoa(
        unescape(encodeURIComponent(svg))
      )}`;
      const markerImage = new kakao.maps.MarkerImage(
        imageSrc,
        new kakao.maps.Size(40, 40)
      );

      const marker = new kakao.maps.Marker({
        position: markerPosition,
        image: markerImage,
      });
      marker.setMap(mapRef.current);

      kakao.maps.event.addListener(marker, "click", () => {
        onStationClick(station);
        openOverlay(station);
      });
      kakao.maps.event.addListener(marker, "dblclick", () => {
        closeOverlay(station.stationId);
      });

      markersRef.current.push(marker);
    });

    for (const id of Array.from(overlaysRef.current.keys())) {
      if (!stations.find((s) => s.stationId === id)) {
        closeOverlay(id);
      }
    }
    layoutOverlays();
  }, [ready, stations, onStationClick, completedStations, workQueue]);

  // ---------- 유저 위치 마커 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || !userLocation) return;
    const kakao = window.kakao;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const pos = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const svg = `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="13" fill="#2563EB" stroke="white" stroke-width="3"/>
</svg>`;
    const userImage = new kakao.maps.MarkerImage(
      `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`,
      new kakao.maps.Size(30, 30)
    );

    userMarkerRef.current = new kakao.maps.Marker({ position: pos, image: userImage });
    userMarkerRef.current.setMap(mapRef.current);
    mapRef.current.setCenter(pos);

    layoutOverlays();
  }, [ready, userLocation]);

  // ---------- 선택된 대여소로 이동 + 오버레이 열기 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedStation) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(
      selectedStation.stationLatitude,
      selectedStation.stationLongitude
    );
    mapRef.current.setCenter(pos);
    mapRef.current.setLevel(2);

    openOverlay(selectedStation);
  }, [ready, selectedStation]);

  // ---------- 예측/재고 변경 시 오버레이 갱신 ----------
  useEffect(() => {
    if (!ready) return;
    for (const [id, v] of overlaysRef.current.entries()) {
      const st = stations.find((s) => s.stationId === id);
      if (st) v.overlay.setContent(createOverlayElement(st));
    }
    layoutOverlays();
  }, [predictedByStation, stations, ready]);

  // ---------- 🔹 재배치 경로(폴리라인) 렌더 ----------
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;

    // 기존 라인/라벨 제거
    polylinesRef.current.forEach((p) => p.setMap(null));
    pathLabelsRef.current.forEach((l) => l.setMap(null));
    polylinesRef.current = [];
    pathLabelsRef.current = [];

    if (!showPaths || !rebalancingPlan?.length) return;

    // id -> station 매핑
    const index = new Map<string, BikeStation>();
    stations.forEach((s) => index.set(normId(s.stationId), s));

    rebalancingPlan.forEach((edge) => {
      const A = index.get(normId(edge.from));
      const B = index.get(normId(edge.to));
      if (!A || !B) return;

      const p1 = new kakao.maps.LatLng(A.stationLatitude, A.stationLongitude);
      const p2 = new kakao.maps.LatLng(B.stationLatitude, B.stationLongitude);

      const line = new kakao.maps.Polyline({
        path: [p1, p2],
        strokeWeight: 5,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.9,
        strokeStyle: "solid",
      });
      line.setMap(mapRef.current);
      polylinesRef.current.push(line);

      // 중간 라벨(이동 대수)
      const mid = new kakao.maps.LatLng(
        (A.stationLatitude + B.stationLatitude) / 2,
        (A.stationLongitude + B.stationLongitude) / 2
      );
      const label = new kakao.maps.CustomOverlay({
        position: mid,
        content: `<div style="background:#111827;color:#fff;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:700;border:1px solid rgba(255,255,255,.4)">${edge.moveCount ?? 0}대</div>`,
        yAnchor: 0.5,
        zIndex: 40,
        clickable: false,
      });
      label.setMap(mapRef.current);
      pathLabelsRef.current.push(label);
    });
  }, [ready, showPaths, rebalancingPlan, stations]);

  function MarkerLegend() {
    return (
      <div className="flex gap-4 items-center mb-2">
        {markerLegend.map((item) => (
          <span key={item.label} className="flex items-center text-sm">
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                marginRight: 4,
                background: item.color,
                border: "2px solid #fff",
                boxShadow: "0 0 1px #333",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <MarkerLegend />
      <div
        ref={mapContainer}
        className="w-full h-[600px] rounded-lg overflow-hidden"
        style={{ background: "#f0f0f0" }}
      />
    </div>
  );
}

/*
"use client";

import { useEffect, useRef, useState } from "react";
import type { BikeStation } from "@/lib/bike-api";

declare global {
  interface Window {
    kakao: any;
    __kakaoLoaderPromise?: Promise<any>;
  }
}

interface KakaoMapProps {
  stations: BikeStation[];
  onStationClick: (station: BikeStation) => void;
  selectedStation: BikeStation | null;
  userLocation: { lat: number; lng: number } | null;
  priorityStations?: BikeStation[];
  completedStations?: Set<string>;
  workQueue?: string[];
  predictedByStation?: Record<string, number>;
}

const markerLegend = [
  { color: "#22C55E", label: "정상(충분)" },
  { color: "#F59E0B", label: "재고 부족(3대 이하) / 작업 대기" },
  { color: "#8B5CF6", label: "작업 완료" },
  { color: "#EF4444", label: "빈 대여소(0대)" },
];

// "ST-01234" -> "1234"
const normId = (v: string | number | undefined | null) =>
  String(v ?? "").replace(/^ST-/, "").replace(/^0+/, "").trim();

// ✅ SDK 로더
function loadKakaoMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (window.__kakaoLoaderPromise) return window.__kakaoLoaderPromise;

  window.__kakaoLoaderPromise = new Promise((resolve, reject) => {
    const id = "kakao-map-sdk";
    const onReady = () => {
      try {
        window.kakao.maps.load(() => {
          if (window.kakao?.maps?.LatLng) resolve(window.kakao);
          else reject(new Error("kakao.maps.LatLng not ready"));
        });
      } catch (e) {
        reject(e);
      }
    };

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps?.load) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      return;
    }

    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appkey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY is missing"));
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services,clusterer&autoload=false`;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK"));
    document.head.appendChild(script);
  });

  return window.__kakaoLoaderPromise;
}

// ---------- 오버레이 배치 관련 상수 & 유틸 ----------
const OVERLAY_W = 240; // 오버레이 가로(px) 추정
const OVERLAY_H = 110; // 오버레이 세로(px) 추정
const MARGIN = 8; // 오버레이끼리 최소 간격
// bottom-center 기준의 후보 오프셋(px)들 (겹치면 다음 자리 시도)
const CANDIDATE_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: -12 }, // 바로 위
  { dx: 100, dy: -12 }, // 우측
  { dx: -100, dy: -12 }, // 좌측
  { dx: 0, dy: 12 }, // 아래
  { dx: 160, dy: -12 }, // 더 우측
  { dx: -160, dy: -12 }, // 더 좌측
  { dx: 100, dy: -90 }, // 우상
  { dx: -100, dy: -90 }, // 좌상
  { dx: 0, dy: -90 }, // 위로 멀리
  { dx: 180, dy: -90 }, // 우상 더 멀리
  { dx: -180, dy: -90 }, // 좌상 더 멀리
];

type Rect = { x: number; y: number; w: number; h: number };
const inflate = (r: Rect, by = MARGIN): Rect => ({
  x: r.x - by,
  y: r.y - by,
  w: r.w + 2 * by,
  h: r.h + 2 * by,
});
const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h > b.y;

export function KakaoMap({
  stations,
  onStationClick,
  selectedStation,
  userLocation,
  priorityStations = [],
  completedStations = new Set(),
  workQueue = [],
  predictedByStation = {},
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // 여러 오버레이 동시 관리: anchor(마커 좌표)와 overlay 객체 저장
  const overlaysRef = useRef<
    Map<
      string,
      {
        overlay: any;
        anchor: any; // kakao.maps.LatLng
      }
    >
  >(new Map());

  const [ready, setReady] = useState(false);

  // ---------- 오버레이 콘텐츠 ----------
  const createOverlayElement = (station: BikeStation) => {
    const key = normId(station.stationId);
    const predicted = predictedByStation[key];
    const hasPred = Number.isFinite(predicted);

    const now = station.parkingBikeTotCnt ?? 0; // 현재 보유
    const cap = station.rackTotCnt ?? 0; // 거치대 수(없을 수도)

    // ✅ 변경 지점: 예측값을 "변화량(Δ)"로 해석 → 최종 재고 = 현재 + Δ
    const delta = hasPred ? Number(predicted) : 0;
    const finalStockRaw = hasPred ? now + delta : null;

    // (옵션) 용량 범위로 보정
    const finalStock =
      hasPred && finalStockRaw !== null
        ? Math.max(0, cap > 0 ? Math.min(finalStockRaw, cap) : finalStockRaw)
        : null;

    const deltaLabel =
      hasPred && delta !== 0 ? (delta > 0 ? `+${delta}` : `${delta}`) : `${delta}`;

    const el = document.createElement("div");
    el.style.pointerEvents = "auto";
    el.innerHTML = `
      <div style="
        background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);
        padding:10px 18px;min-width:${OVERLAY_W - 40}px;max-width:${OVERLAY_W}px;font-size:13px;color:#222;
        border:1px solid #d5d5d5;line-height:1.5;word-break:break-all;">
        <div style="font-weight:bold;margin-bottom:4px;">${station.stationName}</div>
        <div>자전거 <b>${now}대</b>${cap > 0 ? ` / 거치대 <b>${cap}대</b>` : ''}</div>
        ${
          hasPred
            ? `<div style="margin-top:6px;">
                 <b>예측(60분):</b> ${deltaLabel}대<br/>
                 <b>예상 재고:</b> ${finalStock ?? finalStockRaw}대
               </div>`
            : ""
        }
        <div style="margin-top:4px;font-size:11px;color:#666">이 오버레이를 더블클릭하면 닫힙니다</div>
      </div>
    `;
    // 이 오버레이만 닫도록 더블클릭 연결 (지도 줌 방지)
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      closeOverlay(station.stationId);
    });
    return el;
  };

  // ---------- 오버레이 열고/닫기 ----------
  const openOverlay = (station: BikeStation) => {
    if (!mapRef.current) return;
    const kakao = window.kakao;
    const id = station.stationId;

    const existed = overlaysRef.current.get(id);
    if (existed) {
      existed.overlay.setContent(createOverlayElement(station));
      layoutOverlays(); // 내용 갱신 후 재배치
      return;
    }

    const anchor = new kakao.maps.LatLng(
      station.stationLatitude,
      station.stationLongitude
    );
    const overlay = new kakao.maps.CustomOverlay({
      position: anchor, // 일단 앵커에 붙이고
      content: createOverlayElement(station),
      yAnchor: 1.15,
      xAnchor: 0.5,
      zIndex: 25,
      clickable: true,
    });
    overlay.setMap(mapRef.current);
    overlaysRef.current.set(id, { overlay, anchor });

    layoutOverlays(); // 새로 추가되었으니 재배치
  };

  const closeOverlay = (stationId: string) => {
    const ov = overlaysRef.current.get(stationId);
    if (ov) {
      ov.overlay.setMap(null);
      overlaysRef.current.delete(stationId);
      layoutOverlays(); // 남은 것들 다시 정리
    }
  };

  // ---------- 오버레이 자동 배치 (겹침 방지) ----------
  const layoutOverlays = () => {
    if (!mapRef.current || overlaysRef.current.size === 0) return;
    const proj = mapRef.current.getProjection();

    // 앵커 스크린 y기준으로 위쪽부터 배치(겹침 줄이려는 간단한 휴리스틱)
    const entries = Array.from(overlaysRef.current.entries()).map(([id, v]) => {
      const pt = proj.containerPointFromCoords(v.anchor);
      return { id, entry: v, ptY: pt.y, ptX: pt.x };
    });
    entries.sort((a, b) => a.ptY - b.ptY || a.ptX - b.ptX);

    const used: Rect[] = [];
    for (const { entry } of entries) {
      const basePt = proj.containerPointFromCoords(entry.anchor);

      // 후보 오프셋 중 겹치지 않는 자리 찾기
      let chosenPt = { x: basePt.x, y: basePt.y - 12 };
      for (const off of CANDIDATE_OFFSETS) {
        const candBottomCenter = { x: basePt.x + off.dx, y: basePt.y + off.dy };
        const rect: Rect = {
          x: Math.round(candBottomCenter.x - OVERLAY_W / 2),
          y: Math.round(candBottomCenter.y - OVERLAY_H),
          w: OVERLAY_W,
          h: OVERLAY_H,
        };
        const grown = inflate(rect, MARGIN);
        const conflict = used.some((r) => intersects(grown, r));
        if (!conflict) {
          chosenPt = candBottomCenter;
          used.push(grown);
          break;
        }
      }

      // 실제 좌표로 변환하여 세팅 (오버레이는 bottom-center가 position)
      const chosenLatLng = proj.coordsFromContainerPoint(
        new window.kakao.maps.Point(chosenPt.x, chosenPt.y)
      );
      entry.overlay.setPosition(chosenLatLng);
    }
  };

  // ---------- 지도 생성 ----------
  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapContainer.current) return;
        const center = new kakao.maps.LatLng(37.5665, 126.978);
        mapRef.current = new kakao.maps.Map(mapContainer.current, {
          center,
          level: 3,
        });
        // 지도 이동/줌이 끝나면 오버레이 재배치
        const idleHandler = () => layoutOverlays();
        kakao.maps.event.addListener(mapRef.current, "idle", idleHandler);

        // 레이아웃 안정화
        setTimeout(() => {
          if (!cancelled) {
            mapRef.current?.relayout?.();
            mapRef.current?.setCenter(center);
            setReady(true);
          }
        }, 0);
      })
      .catch((err) => {
        console.error("[KakaoMap] SDK load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 리사이즈 대응 (지도 relayout + 오버레이 재배치)
  useEffect(() => {
    if (!ready || !mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.relayout?.();
      layoutOverlays();
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [ready]);

  // ---------- 마커 렌더 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || stations.length === 0) return;
    const kakao = window.kakao;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    stations.forEach((station) => {
      const markerPosition = new kakao.maps.LatLng(
        station.stationLatitude,
        station.stationLongitude
      );

      let markerColor = "#22C55E";
      if (completedStations.has(station.stationId)) markerColor = "#8B5CF6";
      else if (station.parkingBikeTotCnt === 0) markerColor = "#EF4444";
      else if (workQueue.includes(station.stationId) || station.parkingBikeTotCnt <= 3)
        markerColor = "#F59E0B";

      const svg = `
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="${markerColor}" stroke="white" stroke-width="3"/>
</svg>`;
      const imageSrc = `data:image/svg+xml;base64,${btoa(
        unescape(encodeURIComponent(svg))
      )}`;
      const markerImage = new kakao.maps.MarkerImage(
        imageSrc,
        new kakao.maps.Size(40, 40)
      );

      const marker = new kakao.maps.Marker({
        position: markerPosition,
        image: markerImage,
      });
      marker.setMap(mapRef.current);

      // 클릭: 선택 + 오버레이 열기(다른 오버레이 유지)
      kakao.maps.event.addListener(marker, "click", () => {
        onStationClick(station);
        openOverlay(station);
      });

      // 더블클릭: 그 대여소 오버레이만 닫기
      kakao.maps.event.addListener(marker, "dblclick", () => {
        closeOverlay(station.stationId);
      });

      markersRef.current.push(marker);
    });

    // 스테이션 목록이 바뀌면, 열려있던 것 중 존재하지 않는 것 정리
    for (const id of Array.from(overlaysRef.current.keys())) {
      if (!stations.find((s) => s.stationId === id)) {
        closeOverlay(id);
      }
    }

    // 마커 재그리기 후 한 번 정리
    layoutOverlays();
  }, [ready, stations, onStationClick, completedStations, workQueue]);

  // ---------- 유저 위치 마커 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || !userLocation) return;
    const kakao = window.kakao;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const pos = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const svg = `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="13" fill="#2563EB" stroke="white" stroke-width="3"/>
</svg>`;
    const userImage = new kakao.maps.MarkerImage(
      `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`,
      new kakao.maps.Size(30, 30)
    );

    userMarkerRef.current = new kakao.maps.Marker({ position: pos, image: userImage });
    userMarkerRef.current.setMap(mapRef.current);
    mapRef.current.setCenter(pos);

    layoutOverlays();
  }, [ready, userLocation]);

  // ---------- 선택된 대여소로 이동 + 오버레이 열기 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedStation) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(
      selectedStation.stationLatitude,
      selectedStation.stationLongitude
    );
    mapRef.current.setCenter(pos);
    mapRef.current.setLevel(2);

    openOverlay(selectedStation);
  }, [ready, selectedStation]);

  // ---------- 예측/재고 변경 시 열린 오버레이 내용 갱신 + 재배치 ----------
  useEffect(() => {
    if (!ready) return;
    for (const [id, v] of overlaysRef.current.entries()) {
      const st = stations.find((s) => s.stationId === id);
      if (st) v.overlay.setContent(createOverlayElement(st));
    }
    layoutOverlays();
  }, [predictedByStation, stations, ready]);

  function MarkerLegend() {
    return (
      <div className="flex gap-4 items-center mb-2">
        {markerLegend.map((item) => (
          <span key={item.label} className="flex items-center text-sm">
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                marginRight: 4,
                background: item.color,
                border: "2px solid #fff",
                boxShadow: "0 0 1px #333",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <MarkerLegend />
      <div
        ref={mapContainer}
        className="w-full h-[600px] rounded-lg overflow-hidden"
        style={{ background: "#f0f0f0" }}
      />
    </div>
  );
}
*/

/*
"use client";

import { useEffect, useRef, useState } from "react";
import type { BikeStation } from "@/lib/bike-api";

declare global {
  interface Window {
    kakao: any;
    __kakaoLoaderPromise?: Promise<any>;
  }
}

interface KakaoMapProps {
  stations: BikeStation[];
  onStationClick: (station: BikeStation) => void;
  selectedStation: BikeStation | null;
  userLocation: { lat: number; lng: number } | null;
  priorityStations?: BikeStation[];
  completedStations?: Set<string>;
  workQueue?: string[];
  predictedByStation?: Record<string, number>;
}

const markerLegend = [
  { color: "#22C55E", label: "정상(충분)" },
  { color: "#F59E0B", label: "재고 부족(3대 이하) / 작업 대기" },
  { color: "#8B5CF6", label: "작업 완료" },
  { color: "#EF4444", label: "빈 대여소(0대)" },
];

// "ST-01234" -> "1234"
const normId = (v: string | number | undefined | null) =>
  String(v ?? "").replace(/^ST-/, "").replace(/^0+/, "").trim();

// ✅ SDK 로더
function loadKakaoMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (window.__kakaoLoaderPromise) return window.__kakaoLoaderPromise;

  window.__kakaoLoaderPromise = new Promise((resolve, reject) => {
    const id = "kakao-map-sdk";
    const onReady = () => {
      try {
        window.kakao.maps.load(() => {
          if (window.kakao?.maps?.LatLng) resolve(window.kakao);
          else reject(new Error("kakao.maps.LatLng not ready"));
        });
      } catch (e) {
        reject(e);
      }
    };

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps?.load) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      return;
    }

    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appkey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY is missing"));
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services,clusterer&autoload=false`;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK"));
    document.head.appendChild(script);
  });

  return window.__kakaoLoaderPromise;
}

// ---------- 오버레이 배치 관련 상수 & 유틸 ----------
const OVERLAY_W = 240;          // 오버레이 가로(px) 추정
const OVERLAY_H = 110;          // 오버레이 세로(px) 추정
const MARGIN = 8;               // 오버레이끼리 최소 간격
// bottom-center 기준의 후보 오프셋(px)들 (겹치면 다음 자리 시도)
const CANDIDATE_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: -12 },                     // 바로 위
  { dx: 100, dy: -12 },                   // 우측
  { dx: -100, dy: -12 },                  // 좌측
  { dx: 0, dy: 12 },                      // 아래
  { dx: 160, dy: -12 },                   // 더 우측
  { dx: -160, dy: -12 },                  // 더 좌측
  { dx: 100, dy: -90 },                   // 우상
  { dx: -100, dy: -90 },                  // 좌상
  { dx: 0, dy: -90 },                     // 위로 멀리
  { dx: 180, dy: -90 },                   // 우상 더 멀리
  { dx: -180, dy: -90 },                  // 좌상 더 멀리
];

type Rect = { x: number; y: number; w: number; h: number };
const inflate = (r: Rect, by = MARGIN): Rect => ({
  x: r.x - by,
  y: r.y - by,
  w: r.w + 2 * by,
  h: r.h + 2 * by,
});
const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function KakaoMap({
  stations,
  onStationClick,
  selectedStation,
  userLocation,
  priorityStations = [],
  completedStations = new Set(),
  workQueue = [],
  predictedByStation = {},
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // 여러 오버레이 동시 관리: anchor(마커 좌표)와 overlay 객체 저장
  const overlaysRef = useRef<
    Map<
      string,
      {
        overlay: any;
        anchor: any; // kakao.maps.LatLng
      }
    >
  >(new Map());

  const [ready, setReady] = useState(false);

  // ---------- 오버레이 콘텐츠 ----------
  const createOverlayElement = (station: BikeStation) => {
    const key = normId(station.stationId);
    const predicted = predictedByStation[key];
    const hasPred = Number.isFinite(predicted);
    const now = station.parkingBikeTotCnt ?? 0;
    const netStock = hasPred ? now - Number(predicted) : null;

    const el = document.createElement("div");
    el.style.pointerEvents = "auto";
    el.innerHTML = `
      <div style="
        background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);
        padding:10px 18px;min-width:${OVERLAY_W - 40}px;max-width:${OVERLAY_W}px;font-size:13px;color:#222;
        border:1px solid #d5d5d5;line-height:1.5;word-break:break-all;">
        <div style="font-weight:bold;margin-bottom:4px;">${station.stationName}</div>
        <div>자전거 <b>${now}대</b>${(station.rackTotCnt ?? 0) > 0 ? ` / 거치대 <b>${station.rackTotCnt ?? 0}대</b>` : ''}</div>
        ${
          hasPred
            ? `<div style="margin-top:6px;">
                 <b>예측(60분):</b> ${predicted}대<br/>
                 <b>예상 순재고:</b> ${netStock}대
               </div>`
            : ""
        }
        <div style="margin-top:4px;font-size:11px;color:#666">이 오버레이를 더블클릭하면 닫힙니다</div>
      </div>
    `;
    // 이 오버레이만 닫도록 더블클릭 연결 (지도 줌 방지)
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      closeOverlay(station.stationId);
    });
    return el;
  };

  // ---------- 오버레이 열고/닫기 ----------
  const openOverlay = (station: BikeStation) => {
    if (!mapRef.current) return;
    const kakao = window.kakao;
    const id = station.stationId;

    const existed = overlaysRef.current.get(id);
    if (existed) {
      existed.overlay.setContent(createOverlayElement(station));
      layoutOverlays(); // 내용 갱신 후 재배치
      return;
    }

    const anchor = new kakao.maps.LatLng(
      station.stationLatitude,
      station.stationLongitude
    );
    const overlay = new kakao.maps.CustomOverlay({
      position: anchor, // 일단 앵커에 붙이고
      content: createOverlayElement(station),
      yAnchor: 1.15,
      xAnchor: 0.5,
      zIndex: 25,
      clickable: true,
    });
    overlay.setMap(mapRef.current);
    overlaysRef.current.set(id, { overlay, anchor });

    layoutOverlays(); // 새로 추가되었으니 재배치
  };

  const closeOverlay = (stationId: string) => {
    const ov = overlaysRef.current.get(stationId);
    if (ov) {
      ov.overlay.setMap(null);
      overlaysRef.current.delete(stationId);
      layoutOverlays(); // 남은 것들 다시 정리
    }
  };

  // ---------- 오버레이 자동 배치 (겹침 방지) ----------
  const layoutOverlays = () => {
    if (!mapRef.current || overlaysRef.current.size === 0) return;
    const proj = mapRef.current.getProjection();

    // 앵커 스크린 y기준으로 위쪽부터 배치(겹침 줄이려는 간단한 휴리스틱)
    const entries = Array.from(overlaysRef.current.entries()).map(
      ([id, v]) => {
        const pt = proj.containerPointFromCoords(v.anchor);
        return { id, entry: v, ptY: pt.y, ptX: pt.x };
      }
    );
    entries.sort((a, b) => a.ptY - b.ptY || a.ptX - b.ptX);

    const used: Rect[] = [];
    for (const { entry } of entries) {
      const basePt = proj.containerPointFromCoords(entry.anchor);

      // 후보 오프셋 중 겹치지 않는 자리 찾기
      let chosenPt = { x: basePt.x, y: basePt.y - 12 };
      for (const off of CANDIDATE_OFFSETS) {
        const candBottomCenter = { x: basePt.x + off.dx, y: basePt.y + off.dy };
        const rect: Rect = {
          x: Math.round(candBottomCenter.x - OVERLAY_W / 2),
          y: Math.round(candBottomCenter.y - OVERLAY_H),
          w: OVERLAY_W,
          h: OVERLAY_H,
        };
        const grown = inflate(rect, MARGIN);
        const conflict = used.some((r) => intersects(grown, r));
        if (!conflict) {
          chosenPt = candBottomCenter;
          used.push(grown);
          break;
        }
      }

      // 실제 좌표로 변환하여 세팅 (오버레이는 bottom-center가 position)
      const chosenLatLng = proj.coordsFromContainerPoint(
        new window.kakao.maps.Point(chosenPt.x, chosenPt.y)
      );
      entry.overlay.setPosition(chosenLatLng);
    }
  };

  // ---------- 지도 생성 ----------
  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapContainer.current) return;
        const center = new kakao.maps.LatLng(37.5665, 126.978);
        mapRef.current = new kakao.maps.Map(mapContainer.current, {
          center,
          level: 3,
        });
        // 지도 이동/줌이 끝나면 오버레이 재배치
        const idleHandler = () => layoutOverlays();
        kakao.maps.event.addListener(mapRef.current, "idle", idleHandler);

        // 레이아웃 안정화
        setTimeout(() => {
          if (!cancelled) {
            mapRef.current?.relayout?.();
            mapRef.current?.setCenter(center);
            setReady(true);
          }
        }, 0);
      })
      .catch((err) => {
        console.error("[KakaoMap] SDK load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 리사이즈 대응 (지도 relayout + 오버레이 재배치)
  useEffect(() => {
    if (!ready || !mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.relayout?.();
      layoutOverlays();
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [ready]);

  // ---------- 마커 렌더 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || stations.length === 0) return;
    const kakao = window.kakao;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    stations.forEach((station) => {
      const markerPosition = new kakao.maps.LatLng(
        station.stationLatitude,
        station.stationLongitude
      );

      let markerColor = "#22C55E";
      if (completedStations.has(station.stationId)) markerColor = "#8B5CF6";
      else if (station.parkingBikeTotCnt === 0) markerColor = "#EF4444";
      else if (workQueue.includes(station.stationId) || station.parkingBikeTotCnt <= 3)
        markerColor = "#F59E0B";

      const svg = `
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="${markerColor}" stroke="white" stroke-width="3"/>
</svg>`;
      const imageSrc = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));

      const marker = new kakao.maps.Marker({ position: markerPosition, image: markerImage });
      marker.setMap(mapRef.current);

      // 클릭: 선택 + 오버레이 열기(다른 오버레이 유지)
      kakao.maps.event.addListener(marker, "click", () => {
        onStationClick(station);
        openOverlay(station);
      });

      // 더블클릭: 그 대여소 오버레이만 닫기
      kakao.maps.event.addListener(marker, "dblclick", () => {
        closeOverlay(station.stationId);
      });

      markersRef.current.push(marker);
    });

    // 스테이션 목록이 바뀌면, 열려있던 것 중 존재하지 않는 것 정리
    for (const id of Array.from(overlaysRef.current.keys())) {
      if (!stations.find((s) => s.stationId === id)) {
        closeOverlay(id);
      }
    }

    // 마커 재그리기 후 한 번 정리
    layoutOverlays();
  }, [ready, stations, onStationClick, completedStations, workQueue]);

  // ---------- 유저 위치 마커 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || !userLocation) return;
    const kakao = window.kakao;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const pos = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const svg = `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="13" fill="#2563EB" stroke="white" stroke-width="3"/>
</svg>`;
    const userImage = new kakao.maps.MarkerImage(
      `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`,
      new kakao.maps.Size(30, 30)
    );

    userMarkerRef.current = new kakao.maps.Marker({ position: pos, image: userImage });
    userMarkerRef.current.setMap(mapRef.current);
    mapRef.current.setCenter(pos);

    layoutOverlays();
  }, [ready, userLocation]);

  // ---------- 선택된 대여소로 이동 + 오버레이 열기 ----------
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedStation) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(
      selectedStation.stationLatitude,
      selectedStation.stationLongitude
    );
    mapRef.current.setCenter(pos);
    mapRef.current.setLevel(2);

    openOverlay(selectedStation);
  }, [ready, selectedStation]);

  // ---------- 예측/재고 변경 시 열린 오버레이 내용 갱신 + 재배치 ----------
  useEffect(() => {
    if (!ready) return;
    for (const [id, v] of overlaysRef.current.entries()) {
      const st = stations.find((s) => s.stationId === id);
      if (st) v.overlay.setContent(createOverlayElement(st));
    }
    layoutOverlays();
  }, [predictedByStation, stations, ready]);

  function MarkerLegend() {
    return (
      <div className="flex gap-4 items-center mb-2">
        {markerLegend.map((item) => (
          <span key={item.label} className="flex items-center text-sm">
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                marginRight: 4,
                background: item.color,
                border: "2px solid #fff",
                boxShadow: "0 0 1px #333",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <MarkerLegend />
      <div
        ref={mapContainer}
        className="w-full h-[600px] rounded-lg overflow-hidden"
        style={{ background: "#f0f0f0" }}
      />
    </div>
  );
}
*/

/*
"use client";

import { useEffect, useRef, useState } from "react";
import type { BikeStation } from "@/lib/bike-api";

declare global {
  interface Window {
    kakao: any;
    __kakaoLoaderPromise?: Promise<any>;
  }
}

interface KakaoMapProps {
  stations: BikeStation[];
  onStationClick: (station: BikeStation) => void;
  selectedStation: BikeStation | null;
  userLocation: { lat: number; lng: number } | null;
  priorityStations?: BikeStation[];
  completedStations?: Set<string>;
  workQueue?: string[];
  predictedByStation?: Record<string, number>;
}

const markerLegend = [
  { color: "#22C55E", label: "정상(충분)" },
  { color: "#F59E0B", label: "재고 부족(3대 이하) / 작업 대기" },
  { color: "#8B5CF6", label: "작업 완료" },
  { color: "#EF4444", label: "빈 대여소(0대)" },
];

// "ST-01234" -> "1234"
const normId = (v: string | number | undefined | null) =>
  String(v ?? "").replace(/^ST-/, "").replace(/^0+/, "").trim();

// ✅ SDK를 확실히 로드한 뒤 resolve
function loadKakaoMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);

  if (window.__kakaoLoaderPromise) return window.__kakaoLoaderPromise;

  window.__kakaoLoaderPromise = new Promise((resolve, reject) => {
    const id = "kakao-map-sdk";
    const onReady = () => {
      try {
        window.kakao.maps.load(() => {
          if (window.kakao?.maps?.LatLng) resolve(window.kakao);
          else reject(new Error("kakao.maps.LatLng not ready"));
        });
      } catch (e) {
        reject(e);
      }
    };

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps?.load) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      return;
    }

    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appkey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY is missing"));
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services,clusterer&autoload=false`;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK"));
    document.head.appendChild(script);
  });

  return window.__kakaoLoaderPromise;
}

export function KakaoMap({
  stations,
  onStationClick,
  selectedStation,
  userLocation,
  priorityStations = [],
  completedStations = new Set(),
  workQueue = [],
  predictedByStation = {},
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const customOverlayRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // ✅ SDK 로드 + 맵 생성
  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapContainer.current) return;
        const center = new kakao.maps.LatLng(37.5665, 126.978);
        mapRef.current = new kakao.maps.Map(mapContainer.current, {
          center,
          level: 3,
        });
        // relayout 은 다음 틱에
        setTimeout(() => {
          if (!cancelled) {
            mapRef.current?.relayout?.();
            mapRef.current?.setCenter(center);
            setReady(true);
          }
        }, 0);
      })
      .catch((err) => {
        console.error("[KakaoMap] SDK load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 리사이즈 대응
  useEffect(() => {
    if (!ready || !mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.relayout?.());
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [ready]);

  // 마커 렌더
  useEffect(() => {
    if (!ready || !mapRef.current || stations.length === 0) return;
    const kakao = window.kakao;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    stations.forEach((station) => {
      const markerPosition = new kakao.maps.LatLng(
        station.stationLatitude,
        station.stationLongitude,
      );

      let markerColor = "#22C55E";
      if (completedStations.has(station.stationId)) markerColor = "#8B5CF6";
      else if (station.parkingBikeTotCnt === 0) markerColor = "#EF4444";
      else if (workQueue.includes(station.stationId) || station.parkingBikeTotCnt <= 3)
        markerColor = "#F59E0B";

      const svg = `
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="${markerColor}" stroke="white" stroke-width="3"/>
</svg>`;
      const imageSrc = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      const markerImage = new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(40, 40));

      const marker = new kakao.maps.Marker({ position: markerPosition, image: markerImage });
      marker.setMap(mapRef.current);

      const key = normId(station.stationId);
      const predicted = predictedByStation[key];
      const hasPred = Number.isFinite(predicted);
      const netStock = hasPred ? (station.parkingBikeTotCnt ?? 0) - predicted : null;

      const infoContent = `
        <div style="
          background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);
          padding:10px 18px;min-width:180px;max-width:340px;font-size:13px;color:#222;
          border:1px solid #d5d5d5;box-sizing:border-box;word-break:break-all;white-space:normal;line-height:1.5;">
          <div style="font-weight:bold;margin-bottom:4px;">
            ${station.stationName}
          </div>
          <div>자전거 ${station.parkingBikeTotCnt}대${station.rackTotCnt > 0 ? ` / 거치대 ${station.rackTotCnt}대` : ''}</div>
          ${hasPred ? `<div style="margin-top:6px;">
              <span style="font-weight:bold;">예측(60분):</span> ${predicted}대<br/>
              <span style="font-weight:bold;">예상 순재고:</span> ${netStock}대
            </div>` : ""}
          ${completedStations.has(station.stationId) ? '<div style="color:#8B5CF6;font-weight:bold;">작업 완료</div>' : ""}
          ${workQueue.includes(station.stationId) ? '<div style="color:#F59E0B;font-weight:bold;">작업 대기</div>' : ""}
        </div>
      `;

      kakao.maps.event.addListener(marker, "mouseover", () => {
        if (customOverlayRef.current) customOverlayRef.current.setMap(null);
        customOverlayRef.current = new kakao.maps.CustomOverlay({
          content: infoContent,
          map: mapRef.current,
          position: markerPosition,
          yAnchor: 1.15,
          zIndex: 11,
        });
      });
      kakao.maps.event.addListener(marker, "mouseout", () => {
        if (customOverlayRef.current) customOverlayRef.current.setMap(null);
      });
      kakao.maps.event.addListener(marker, "click", () => onStationClick(station));

      markersRef.current.push(marker);
    });
  }, [ready, stations, onStationClick, completedStations, workQueue, predictedByStation]);

  // 유저 위치 마커
  useEffect(() => {
    if (!ready || !mapRef.current || !userLocation) return;
    const kakao = window.kakao;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const pos = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const svg = `
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="13" fill="#2563EB" stroke="white" stroke-width="3"/>
</svg>`;
    const userImage = new kakao.maps.MarkerImage(
      `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`,
      new kakao.maps.Size(30, 30),
    );

    userMarkerRef.current = new kakao.maps.Marker({ position: pos, image: userImage });
    userMarkerRef.current.setMap(mapRef.current);
    mapRef.current.setCenter(pos);
  }, [ready, userLocation]);

  // 선택된 대여소로 이동
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedStation) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(
      selectedStation.stationLatitude,
      selectedStation.stationLongitude,
    );
    mapRef.current.setCenter(pos);
    mapRef.current.setLevel(2);
  }, [ready, selectedStation]);

  function MarkerLegend() {
    return (
      <div className="flex gap-4 items-center mb-2">
        {markerLegend.map((item) => (
          <span key={item.label} className="flex items-center text-sm">
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                marginRight: 4,
                background: item.color,
                border: "2px solid #fff",
                boxShadow: "0 0 1px #333",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <MarkerLegend />
      <div
        ref={mapContainer}
        className="w-full h-[600px] rounded-lg overflow-hidden"
        style={{ background: "#f0f0f0" }}
      />
    </div>
  );
}
*/