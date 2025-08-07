"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation" // 추가: useRouter import 필요
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { KakaoMap } from "@/components/kakao-map"
import { AdminPanel } from "@/components/admin-panel"
import { WorkQueue } from "@/components/work-queue"
import { type BikeStation } from "@/lib/bike-api"
import BikeStationsAPI from "@/api/bikeStationsAPI"
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
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { PublicMap } from "@/components/public-map"
import { Loader2 } from "lucide-react"

// 로그인한 사용자를 관리자 페이지로 리다이렉트하는 로직 추가
export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter() // 추가: useRouter import 필요
  const [isRedirecting, setIsRedirecting] = useState(false) // 🆕 리다이렉트 상태 추가

  useEffect(() => {
    // 🔥 로딩이 완료되고 사용자가 로그인한 상태일 때만 리다이렉트
    if (!loading && user && !isRedirecting) {
      console.log("🔄 [HomePage] 로그인된 사용자 감지 - 관리자 페이지로 리다이렉트")
      setIsRedirecting(true)

      // 🆕 약간의 지연을 두어 깜빡임 방지
      setTimeout(() => {
        router.push("/admin")
      }, 100)
    }
  }, [user, loading, router, isRedirecting])

  // 🔥 로딩 중이거나 리다이렉트 중일 때 로딩 화면 표시
  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800">
            {isRedirecting ? "관리자 페이지로 이동 중..." : "로딩 중..."}
          </h2>
          <p className="text-gray-600 mt-2">
            {isRedirecting ? "잠시만 기다려주세요" : "사용자 정보를 확인하고 있습니다"}
          </p>
        </div>
      </div>
    )
  }

  // 🔥 로그인하지 않은 사용자만 공개 지도 표시
  if (!user) {
    console.log("👤 [HomePage] 비로그인 사용자 - 공개 지도 표시")
    return <PublicMap />
  }

  // 이 부분은 실행되지 않아야 하지만 안전장치로 유지
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
        <h2 className="text-xl font-semibold text-gray-800">처리 중...</h2>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const { user, logout } = useAuth()
  const [stations, setStations] = useState<BikeStation[]>([])
  const [selectedStation, setSelectedStation] = useState<BikeStation | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workQueue, setWorkQueue] = useState<string[]>([])
  const [completedStations, setCompletedStations] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const loadStations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      
      // BikeStationsAPI를 사용하여 스프링 백엔드에서 자전거 정류소 데이터 가져오기
      const data = await BikeStationsAPI.getBikeStations()
      setStations(data)
    } catch (err) {
      setError("따릉이 데이터를 불러오는데 실패했습니다.")
      console.error("Error loading stations:", err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 서비스를 지원하지 않습니다.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        setError("위치 정보를 가져올 수 없습니다.")
      },
    )
  }

  useEffect(() => {
    loadStations()
    getUserLocation()

    const interval = setInterval(() => loadStations(true), 60000)
    return () => clearInterval(interval)
  }, [])

  const lowStockStations = stations.filter(
    (station) => station.parkingBikeTotCnt <= 3 && !completedStations.has(station.stationId),
  )

  const emptyStations = stations.filter(
    (station) => station.parkingBikeTotCnt === 0 && !completedStations.has(station.stationId),
  )

  const priorityStations = [...emptyStations, ...lowStockStations].sort(
    (a, b) => a.parkingBikeTotCnt - b.parkingBikeTotCnt,
  )

  const handleStationClick = (station: BikeStation) => {
    setSelectedStation(station)
  }

  const addToWorkQueue = (stationId: string) => {
    if (!workQueue.includes(stationId)) {
      setWorkQueue([...workQueue, stationId])
    }
  }

  const removeFromWorkQueue = (stationId: string) => {
    setWorkQueue(workQueue.filter((id) => id !== stationId))
  }

  const markAsCompleted = (stationId: string) => {
    setCompletedStations(new Set([...completedStations, stationId]))
    removeFromWorkQueue(stationId)
  }

  // 로딩 중일 때도 지도는 렌더링하되, 데이터가 없으면 빈 지도 표시
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-50 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">따릉이 관리 시스템</h1>
                  <p className="text-blue-100">실시간 모니터링 및 작업 관리</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm">로딩 중...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Map - Main Focus */}
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
                    />
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                          <RefreshCw className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">데이터 로딩 중...</h3>
                        <p className="text-gray-600">따릉이 정보를 가져오고 있습니다</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Loading Sidebar */}
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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-lg flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">따릉이 관리자 시스템</h1>
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

      {/* Admin Stats */}
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
                  <p className="text-2xl font-bold text-green-600">{completedStations.size}</p>
                  <p className="text-sm text-gray-600">오늘 완료</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="glass-effect border-red-200 bg-red-50/80 mb-6">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Map - Main Focus */}
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

          {/* Admin Sidebar */}
          <div className="space-y-6">
            <WorkQueue
              workQueue={workQueue}
              stations={stations}
              onRemove={removeFromWorkQueue}
              onComplete={markAsCompleted}
              userLocation={userLocation}
            />

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
  )
}
