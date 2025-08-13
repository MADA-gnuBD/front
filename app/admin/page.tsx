// app/admin/page.tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { KakaoMap } from "@/components/kakao-map";
import { AdminPanel } from "@/components/admin-panel";
import { WorkQueue } from "@/components/work-queue";

import { useAuth } from "@/contexts/auth-context";
import { useWorkHistory } from "@/contexts/work-history-context";

import BikeStationsAPI from "@/api/bikeStationsAPI";
import { type BikeStation } from "@/lib/bike-api";
import { AIApi } from "@/lib/ai-api";

import {
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  MessageSquare,
  Shield,
  User,
  LogOut,
  Loader2,
  Sparkles,
  Navigation,
} from "lucide-react";

// 🔧 아이디 정규화
const normId = (v: string | number | undefined | null) =>
  String(v ?? "").replace(/^ST-/, "").replace(/^0+/, "").trim();

type RebalanceRow = {
  fromId: string;
  toId: string;
  fromName?: string;
  toName?: string;
  distance?: number;
  moveCount: number;
};

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const { addWorkHistory, workHistory } = useWorkHistory();
  const router = useRouter();

  const [stations, setStations] = useState<BikeStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<BikeStation | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workQueue, setWorkQueue] = useState<string[]>([]);
  const [completedStations, setCompletedStations] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [totalCompletedCount, setTotalCompletedCount] = useState(0);

  // ✅ 예측값 저장
  const [predictedByStation, setPredictedByStation] = useState<Record<string, number>>({});

  // 🔄 재배치 계획
  const [plan, setPlan] = useState<RebalanceRow[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [showPaths, setShowPaths] = useState(true);

  // AI 버튼 상태
  const [aiLoading1, setAiLoading1] = useState(false);
  const [aiLoading2, setAiLoading2] = useState(false);
  const DEFAULT_MIN = 60;
  const DEFAULT_RADIUS = 500;

  // 인증 체크
  useEffect(() => {
    if (!loading && !user && !isRedirecting) {
      setIsRedirecting(true);
      setTimeout(() => router.push("/auth"), 100);
    }
  }, [user, loading, router, isRedirecting]);

  // 데이터 로딩
  const loadStations = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setIsLoading(true);
      setError(null);
      const bikeStations = await BikeStationsAPI.getBikeStations();
      setStations(bikeStations);
    } catch (err) {
      console.error(err);
      setError("따릉이 데이터를 불러오는데 실패했습니다. 스프링 서버를 확인해주세요.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => setError("위치 정보를 가져올 수 없습니다."),
    );
  };

  useEffect(() => {
    loadStations();
    getUserLocation();
    const interval = setInterval(() => loadStations(true), 60000);
    return () => clearInterval(interval);
  }, []);

  // 우선순위 계산
  const emptyStations = stations.filter(
    (s) => s.parkingBikeTotCnt === 0 && !completedStations.has(s.stationId),
  );
  const lowStockStations = stations.filter(
    (s) =>
      s.parkingBikeTotCnt > 0 &&
      s.parkingBikeTotCnt <= 3 &&
      !completedStations.has(s.stationId),
  );
  const priorityStations = [
    ...emptyStations.sort((a, b) => a.parkingBikeTotCnt - b.parkingBikeTotCnt),
    ...lowStockStations.sort((a, b) => a.parkingBikeTotCnt - b.parkingBikeTotCnt),
  ];

  // 지도/사이드 이벤트
  const handleStationClick = (station: BikeStation) => setSelectedStation(station);
  const addToWorkQueue = (stationId: string) => {
    if (!workQueue.includes(stationId)) setWorkQueue((q) => [...q, stationId]);
  };
  const removeFromWorkQueue = (stationId: string) =>
    setWorkQueue((q) => q.filter((id) => id !== stationId));

  const markAsCompleted = async (stationId: string) => {
    try {
      const station = stations.find((s) => s.stationId === stationId);
      if (!station) return;

      let workType = "";
      let description = "";
      if (station.parkingBikeTotCnt === 0) {
        workType = "긴급 자전거 보충";
        description = "빈 대여소에 자전거 보충 완료";
      } else if (station.parkingBikeTotCnt <= 3) {
        workType = "자전거 보충";
        description = `재고 부족 대여소에 자전거 보충 완료 (현재: ${station.parkingBikeTotCnt}대)`;
      } else {
        workType = "대여소 점검";
        description = "대여소 상태 점검 및 정비 완료";
      }

      await addWorkHistory({
        stationName: station.stationName,
        stationId: station.stationId,
        action: workType,
        notes: description,
      });
    } catch (e) {
      console.error(e);
      setError("작업 이력 저장에 실패했습니다.");
    }

    setCompletedStations((s) => new Set([...s, stationId]));
    removeFromWorkQueue(stationId);
  };

  // 완료 카운트
  useEffect(() => {
    if (user) {
      const cnt = workHistory.filter((w) => w.userId === user.email).length;
      setTotalCompletedCount(cnt);
    }
  }, [user, workHistory]);

  // 🔹 단일 예측
  async function handleSinglePredict() {
    if (!selectedStation) return alert("정류소를 먼저 선택해 주세요.");
    try {
      setAiLoading1(true);
      const res: any = await AIApi.predict({
        stationId: String(selectedStation.stationId),
        minutes: DEFAULT_MIN,
        supply: selectedStation.parkingBikeTotCnt ?? 0,
      });
      const predicted = Number(res?.predicted_demand);
      if (!Number.isFinite(predicted)) {
        console.warn("예측 응답 형식이 예상과 다릅니다:", res);
        alert("예측 응답 형식이 올바르지 않습니다.");
        return;
      }
      setPredictedByStation((prev) => ({
        ...prev,
        [normId(selectedStation.stationId)]: predicted,
      }));
      console.log("🤖 단일 예측 결과:", { stationId: selectedStation.stationId, predicted });
    } catch (e: any) {
      console.error(e);
      alert("AI 단일 예측 실패: " + (e?.message ?? ""));
    } finally {
      setAiLoading1(false);
    }
  }

  // 🔹 반경 예측(오버레이 값 반영)
  async function handleRangePredict() {
    let center: { lat: number; lng: number } | null = null;

    if (selectedStation) {
      center = {
        lat: selectedStation.stationLatitude,
        lng: selectedStation.stationLongitude,
      };
    } else if (userLocation) {
      center = { lat: userLocation.lat, lng: userLocation.lng };
    }

    if (!center) {
      alert("정류소를 선택하거나 위치 권한을 허용해 주세요.");
      return;
    }

    try {
      setAiLoading2(true);
      const res: any = await AIApi.rangePredict({
        lat: center.lat,
        lng: center.lng,
        radius: DEFAULT_RADIUS,
        minutes: DEFAULT_MIN,
      });

      const listRaw = (res?.result ?? res?.results ?? res) as any;
      const arr: any[] = Array.isArray(listRaw) ? listRaw : [];
      setPredictedByStation((prev) => {
        const next = { ...prev };
        for (const r of arr) {
          const rawId = r?.id ?? r?.station_id ?? r?.stationId;
          const p = Number(r?.predicted_demand ?? r?.predictedDemand ?? r?.pred);
          const key = String(rawId ?? "").replace(/^ST-/, "").replace(/^0+/, "").trim();
          if (key && Number.isFinite(p)) next[key] = p;
        }
        return next;
      });
    } catch (e: any) {
      console.error(e);
      alert("AI 반경 예측 실패: " + (e?.message ?? ""));
    } finally {
      setAiLoading2(false);
    }
  }

  // 🔹 재배치 계획 실행 (range-predict 응답의 rebalancing_plan 사용)
  async function handleRebalancePlan() {
    let center: { lat: number; lng: number } | null = null;
    if (selectedStation) {
      center = { lat: selectedStation.stationLatitude, lng: selectedStation.stationLongitude };
    } else if (userLocation) {
      center = { lat: userLocation.lat, lng: userLocation.lng };
    }
    if (!center) {
      alert("정류소를 선택하거나 위치 권한을 허용해 주세요.");
      return;
    }

    try {
      setPlanLoading(true);
      const res: any = await AIApi.rangePredict({
        lat: center.lat,
        lng: center.lng,
        radius: DEFAULT_RADIUS,
        minutes: DEFAULT_MIN,
      });

      // 예측치도 반영
      const listRaw = (res?.result ?? res?.results ?? []) as any[];
      if (Array.isArray(listRaw)) {
        setPredictedByStation((prev) => {
          const next = { ...prev };
          for (const r of listRaw) {
            const rawId = r?.id ?? r?.station_id ?? r?.stationId;
            const p = Number(r?.predicted_demand ?? r?.predictedDemand ?? r?.pred);
            const key = String(rawId ?? "").replace(/^ST-/, "").replace(/^0+/, "").trim();
            if (key && Number.isFinite(p)) next[key] = p;
          }
          return next;
        });
      }

      const rawPlan = (res?.rebalancing_plan ?? []) as any[];
      const mapped: RebalanceRow[] = rawPlan.map((p) => {
        const fromId = typeof p.from === "object" ? p.from.id : p.from;
        const toId = typeof p.to === "object" ? p.to.id : p.to;
        const fromName =
          typeof p.from === "object"
            ? p.from.name
            : stations.find((s) => normId(s.stationId) === normId(fromId))?.stationName;
        const toName =
          typeof p.to === "object"
            ? p.to.name
            : stations.find((s) => normId(s.stationId) === normId(toId))?.stationName;
        return {
          fromId: String(fromId),
          toId: String(toId),
          fromName,
          toName,
          distance: Number(p.distance ?? 0),
          moveCount: Number(p.move_count ?? p.moveCount ?? 0),
        };
      });
      setPlan(mapped);
      setShowPaths(true);
    } catch (e: any) {
      console.error(e);
      alert("재배치 계획 실행 실패: " + (e?.message ?? ""));
    } finally {
      setPlanLoading(false);
    }
  }

  const idToStation = (idLike: string) => {
    const n = normId(idLike);
    return stations.find((s) => normId(s.stationId) === n) || null;
  };

  const displayName = (idLike: string, fallback?: string) => {
    const st = idToStation(idLike);
    return st?.stationName ?? fallback ?? `정류소 ${normId(idLike)}`;
  };

  // 로딩/리다이렉트
  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800">
            {isRedirecting ? "로그인 페이지로 이동 중..." : "로딩 중..."}
          </h2>
          <p className="text-gray-600 mt-2">
            {isRedirecting ? "잠시만 기다려주세요" : "사용자 정보를 확인하고 있습니다"}
          </p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  // 스켈레톤 로딩
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-50 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-lg flex items-center justify-center">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">VeloNext 관리자 시스템</h1>
                  <p className="text-blue-100">환영합니다, {user?.name}님</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm">로딩 중...</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <Card className="glass-effect border-0 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      관리자 운영 지도
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-600">데이터 로딩 중...</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative">
                    <KakaoMap
                      stations={[]}
                      onStationClick={() => {}}
                      selectedStation={null}
                      userLocation={null}
                      priorityStations={[]}
                      completedStations={new Set()}
                      workQueue={[]}
                      predictedByStation={{}}
                    />
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                          <RefreshCw className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">데이터 로딩 중...</h3>
                        <p className="text-gray-600">VeloNext 정보를 가져오고 있습니다</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="glass-effect border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    작업 대기
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">로딩 중...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 메인
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-lg flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">VeloNext Admin</h1>
                <p className="text-blue-100">환영합니다, {user?.name}님</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/mypage">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <User className="w-4 h-4 mr-2" />
                  마이페이지
                </Button>
              </Link>
              <Link href="/community">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  커뮤니티
                </Button>
              </Link>
              <Button
                onClick={() => loadStations(true)}
                disabled={refreshing}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                새로고침
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{emptyStations.length}</p>
                  <p className="text-sm text-gray-600">긴급 보충 필요</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{lowStockStations.length}</p>
                  <p className="text-sm text-gray-600">재고 부족</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{workQueue.length}</p>
                  <p className="text-sm text-gray-600">작업 대기</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{totalCompletedCount}</p>
                  <p className="text-sm text-gray-600">작업 완료</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <Alert className="glass-effect border-red-200 bg-red-50/80 mb-6">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Main */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Map */}
          <div className="xl:col-span-3">
            <Card className="glass-effect border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    관리자 운영 지도
                    <Badge className="bg-red-100 text-red-800">우선순위: {priorityStations.length}개</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-600">실시간 모니터링</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative">
                  <KakaoMap
                    stations={stations}
                    onStationClick={handleStationClick}
                    selectedStation={selectedStation}
                    userLocation={userLocation}
                    priorityStations={priorityStations}
                    completedStations={completedStations}
                    workQueue={workQueue}
                    predictedByStation={predictedByStation}
                    rebalancingPlan={plan.map((p) => ({
                      from: p.fromId,
                      to: p.toId,
                      moveCount: p.moveCount,
                    }))}
                    showPaths={showPaths}
                  />
                  {refreshing && (
                    <div className="absolute top-4 right-4 glass-effect rounded-full p-3">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <WorkQueue
              workQueue={workQueue}
              stations={stations}
              onRemove={removeFromWorkQueue}
              onComplete={markAsCompleted}
              userLocation={userLocation}
            />

            {/* 🔹 AI 예측 카드 */}
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI 예측
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  onClick={handleSinglePredict}
                  disabled={!selectedStation || aiLoading1}
                  variant="outline"
                  title="선택 정류소 60분 예측"
                >
                  {aiLoading1 ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI 단일
                </Button>
                <Button
                  onClick={handleRangePredict}
                  disabled={(!selectedStation && !userLocation) || aiLoading2}
                  variant="outline"
                  title={
                    selectedStation
                      ? `선택 정류소 기준 ${DEFAULT_RADIUS}m / ${DEFAULT_MIN}분`
                      : userLocation
                      ? `내 위치 반경 ${DEFAULT_RADIUS}m / ${DEFAULT_MIN}분`
                      : "현재 위치 또는 정류소 필요"
                  }
                >
                  {aiLoading2 ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI 반경
                </Button>
              </CardContent>
            </Card>

            {/* 🔹 재배치 계획 카드 */}
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  재배치 계획
                  <Badge variant="outline" className="ml-2">{plan.length}</Badge>
                </CardTitle>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={showPaths ? "default" : "outline"}
                    onClick={() => setShowPaths((v) => !v)}
                    title="지도에 이동 경로 선 표시/숨김"
                  >
                    선 {showPaths ? "숨김" : "표시"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRebalancePlan}
                    disabled={planLoading || (!selectedStation && !userLocation)}
                    title="현재 선택 정류소 또는 내 위치 기준 반경 내 재배치 계획 계산"
                  >
                    {planLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
                    실행
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {plan.length === 0 ? (
                  <p className="text-sm text-gray-500">실행 후 재배치 계획이 여기에 표시됩니다.</p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                    {plan.map((p, idx) => (
                      <div
                        key={`${p.fromId}-${p.toId}-${idx}`}
                        className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
                      >
                        <div className="text-sm">
                          <div className="font-medium">
                            {displayName(p.fromId, p.fromName)} → {displayName(p.toId, p.toName)}
                          </div>
                          <div className="text-xs text-gray-500">
                            이동 {p.moveCount}대 • 거리 {p.distance ?? "-"}m
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const st = idToStation(p.fromId);
                              if (st) setSelectedStation(st);
                            }}
                          >
                            FROM
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const st = idToStation(p.toId);
                              if (st) setSelectedStation(st);
                            }}
                          >
                            TO
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <AdminPanel
              selectedStation={selectedStation}
              priorityStations={priorityStations}
              onAddToQueue={addToWorkQueue}
              onMarkCompleted={markAsCompleted}
              workQueue={workQueue}
              completedStations={completedStations}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
