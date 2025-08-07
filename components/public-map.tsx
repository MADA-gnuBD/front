"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KakaoMap } from "@/components/kakao-map"
import { type BikeStation } from "@/lib/bike-api"
import BikeStationsAPI from "@/api/bikeStationsAPI"
import { MapPin, RefreshCw, Bike, LogIn, UserPlus } from "lucide-react"
import Link from "next/link"

export function PublicMap() {
  const [stations, setStations] = useState<BikeStation[]>([])
  const [selectedStation, setSelectedStation] = useState<BikeStation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      // BikeStationsAPI를 사용하여 스프링 백엔드에서 자전거 정류소 데이터 가져오기
      const data = await BikeStationsAPI.getBikeStations()
      setStations(data)
    } catch (err) {
      console.error("Error loading stations:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadStations()
    const interval = setInterval(() => loadStations(true), 60000)
    return () => clearInterval(interval)
  }, [])

  const handleStationClick = (station: BikeStation) => {
    setSelectedStation(station)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Bike className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">따릉이 지도 로딩 중...</h2>
          <p className="text-gray-600">실시간 대여소 정보를 불러오고 있습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Public Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bike className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">따릉이 실시간 현황</h1>
                <p className="text-sm text-gray-600">서울시 공공자전거 대여소 정보</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => loadStations(true)}
                disabled={refreshing}
                variant="outline"
                className="glass-effect border-0 bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                새로고침
              </Button>
              <Link href="/auth">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Login Notice */}
      <div className="container mx-auto px-4 py-4">
        <Card className="glass-effect border-0 shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">더 많은 기능을 이용하세요!</h3>
                  <p className="text-sm text-gray-600">로그인하시면 관리 기능과 커뮤니티를 이용할 수 있습니다.</p>
                </div>
              </div>
              <Link href="/auth">
                <Button variant="outline" className="glass-effect border-0 bg-transparent">
                  로그인 / 회원가입
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 대여소</p>
                  <p className="text-3xl font-bold text-blue-600">{stations.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">이용 가능한 자전거</p>
                  <p className="text-3xl font-bold text-green-600">
                    {(() => {
                      const total = stations.reduce((sum, station) => sum + station.parkingBikeTotCnt, 0)
                      return total >= 100 ? "1000+" : total
                    })()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Bike className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">운영 중인 대여소</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {stations.filter((station) => station.parkingBikeTotCnt > 0).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <Card className="glass-effect border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
            <CardTitle className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-blue-600" />
              따릉이 실시간 지도
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">실시간</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
              <KakaoMap
                stations={stations}
                onStationClick={handleStationClick}
                selectedStation={selectedStation}
                userLocation={null}
              />
              {refreshing && (
                <div className="absolute top-4 right-4 glass-effect rounded-full p-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Station Info */}
        {selectedStation && (
          <Card className="glass-effect border-0 shadow-xl mt-6">
            <CardHeader>
              <CardTitle>선택된 대여소</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">{selectedStation.stationName}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">이용 가능한 자전거</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedStation.parkingBikeTotCnt}대</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">총 거치대</p>
                    <p className="text-2xl font-bold text-gray-700">{selectedStation.rackTotCnt}개</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
