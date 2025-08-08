"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Brain, Router, MapPin, Clock, TrendingUp, Zap } from "lucide-react"
import type { BikeStation } from "@/lib/bike-api"
import { calculateDistance, formatDistance } from "@/lib/utils"

interface AIRouteOptimizerProps {
  selectedStation: BikeStation | null
  stations: BikeStation[]
  userLocation: { lat: number; lng: number } | null
}

interface OptimizedRoute {
  id: string
  fromStation: BikeStation
  toStations: BikeStation[]
  totalDistance: number
  estimatedTime: number
  priority: "high" | "medium" | "low"
  reason: string
}

export function AIRouteOptimizer({ selectedStation, stations, userLocation }: AIRouteOptimizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([])

  const analyzeOptimalRoute = async () => {
    if (!selectedStation || !userLocation) return

    setIsAnalyzing(true)

    // AI 모델 시뮬레이션 (실제로는 백엔드 AI API 호출)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 재고 부족 대여소 찾기
    const lowStockStations = stations.filter(
      (station) => station.parkingBikeTotCnt <= 3 && station.stationId !== selectedStation.stationId,
    )

    // 거리 계산 및 우선순위 결정
    const routesWithDistance = lowStockStations
      .map((station) => ({
        station,
        distance: calculateDistance(
          selectedStation.stationLatitude,
          selectedStation.stationLongitude,
          station.stationLatitude,
          station.stationLongitude,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5) // 상위 5개만

    // 최적 경로 생성
    const routes: OptimizedRoute[] = routesWithDistance.map((item, index) => {
      const priority = index === 0 ? "high" : index <= 2 ? "medium" : "low"
      const estimatedTime = Math.round(item.distance * 10) // 1km당 10분 가정

      let reason = ""
      if (item.station.parkingBikeTotCnt === 0) {
        reason = "긴급: 자전거가 완전히 소진된 대여소"
      } else if (item.station.parkingBikeTotCnt <= 2) {
        reason = "높은 우선순위: 재고가 매우 부족한 대여소"
      } else {
        reason = "보통 우선순위: 재고 보충이 필요한 대여소"
      }

      return {
        id: `route_${index}`,
        fromStation: selectedStation,
        toStations: [item.station],
        totalDistance: item.distance,
        estimatedTime,
        priority,
        reason,
      }
    })

    setOptimizedRoutes(routes)
    setIsAnalyzing(false)
  }

  const handleOptimizeRoute = () => {
    setIsOpen(true)
    analyzeOptimalRoute()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "긴급"
      case "medium":
        return "높음"
      case "low":
        return "보통"
      default:
        return "일반"
    }
  }

  return (
    <>
      <Card className="glass-effect border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-white/20">
          <CardTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            AI 경로 최적화
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-800">AI 기반 최적 경로 분석</h4>
              </div>
              <p className="text-sm text-purple-700 mb-3">
                선택한 대여소에서 가장 가까운 재고 부족 대여소로의 최적 경로를 AI가 분석합니다.
              </p>
              <ul className="text-xs text-purple-600 space-y-1">
                <li>• 실시간 재고 현황 분석</li>
                <li>• 거리 및 소요 시간 계산</li>
                <li>• 우선순위 기반 경로 추천</li>
                <li>• 교통 상황 고려 (예정)</li>
              </ul>
            </div>

            {selectedStation ? (
              <div className="space-y-3">
                <div className="bg-white/50 rounded-lg p-3 border border-gray-100">
                  <h5 className="font-medium text-gray-800 mb-1">선택된 출발지</h5>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedStation.stationName}
                  </p>
                </div>

                <Button
                  onClick={handleOptimizeRoute}
                  disabled={!userLocation}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  AI 경로 분석 시작
                </Button>

                {!userLocation && <p className="text-xs text-gray-500 text-center">위치 정보가 필요합니다</p>}
              </div>
            ) : (
              <div className="text-center py-6">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">대여소를 선택해주세요</p>
                <p className="text-gray-400 text-xs mt-1">지도에서 대여소를 클릭하면 AI 분석이 가능합니다</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI 분석 결과 모달 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl glass-effect border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              AI 최적 경로 분석 결과
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {isAnalyzing ? (
              <div className="text-center py-12">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-6 animate-pulse mx-auto">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-purple-200 rounded-full animate-ping mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">AI가 최적 경로를 분석 중입니다...</h3>
                <p className="text-gray-600 mb-4">실시간 데이터를 기반으로 최적의 경로를 계산하고 있습니다</p>
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-8 bg-gradient-to-t from-purple-500 to-pink-600 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2">📊 분석 요약</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{optimizedRoutes.length}</p>
                      <p className="text-sm text-purple-700">추천 경로</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-pink-600">
                        {optimizedRoutes.filter((r) => r.priority === "high").length}
                      </p>
                      <p className="text-sm text-pink-700">긴급 우선순위</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {optimizedRoutes.length > 0 ? Math.round(optimizedRoutes[0].estimatedTime) : 0}분
                      </p>
                      <p className="text-sm text-blue-700">최단 소요시간</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {optimizedRoutes.map((route, index) => (
                    <Card key={route.id} className="glass-effect border-0 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-800">{route.toStations[0].stationName}</h5>
                              <p className="text-sm text-gray-600">{route.reason}</p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(route.priority)}>{getPriorityLabel(route.priority)}</Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Router className="w-4 h-4 text-blue-600" />
                            <span>{formatDistance(route.totalDistance)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span>{route.estimatedTime}분</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-600" />
                            <span>{route.toStations[0].parkingBikeTotCnt}대 보유</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                        >
                          <Router className="w-4 h-4 mr-2" />이 경로로 이동
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {optimizedRoutes.length === 0 && (
                  <div className="text-center py-8">
                    <Router className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">추천할 경로가 없습니다</h3>
                    <p className="text-gray-500">현재 재고 부족 대여소가 없거나 모든 대여소가 정상 상태입니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
