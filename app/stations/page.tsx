"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StationsList } from "@/components/stations-list"
import { BikeStationInfo } from "@/components/bike-station-info"
import { LoadingSpinner } from "@/components/loading-spinner"
import { type BikeStation } from "@/lib/bike-api"
import { calculateDistance } from "@/lib/utils"
import { MapPin, RefreshCw, Bike, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import BikeStationsAPI from "@/api/bikeStationsAPI"

export default function StationsPage() {
  const [stations, setStations] = useState<BikeStation[]>([])
  const [selectedStation, setSelectedStation] = useState<BikeStation | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stationsWithDistance, setStationsWithDistance] = useState<Array<BikeStation & { distance: number }>>([])

  const loadStations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      // BikeStationsAPI를 사용하여 스프링 백엔드에서 자전거 정류소 데이터 가져오기
      const data = await BikeStationsAPI.getBikeStations()
      setStations(data)
    } catch (err) {
      setError("따릉이 데이터를 불러오는데 실패했습니다.")
      console.error("Error loading stations:", err)
    } finally {
      setLoading(false)
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
    if (userLocation && stations.length > 0) {
      const withDistance = stations.map((station) => ({
        ...station,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          station.stationLatitude,
          station.stationLongitude,
        ),
      }))
      setStationsWithDistance(withDistance)
    }
  }, [userLocation, stations])

  useEffect(() => {
    loadStations()
    getUserLocation()

    const interval = setInterval(() => loadStations(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleStationClick = (station: BikeStation) => {
    setSelectedStation(station)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const totalBikes = stations.reduce((sum, station) => sum + station.parkingBikeTotCnt, 0)
  const closestDistance =
    userLocation && stationsWithDistance.length > 0
      ? stationsWithDistance.sort((a, b) => a.distance - b.distance)[0]?.distance
      : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="glass-effect border-0 bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  관리자 페이지
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Bike className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">따릉이 실시간 현황</h1>
                  <p className="text-sm text-gray-600">대여소별 자전거 현황</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={getUserLocation} variant="outline" className="glass-effect border-0 bg-transparent">
                <MapPin className="w-4 h-4 mr-2" />내 위치
              </Button>
              <Button
                onClick={() => loadStations(true)}
                disabled={refreshing}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                새로고침
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <p className="text-3xl font-bold text-green-600">{totalBikes}</p>
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
                  <p className="text-sm font-medium text-gray-600">가장 가까운 대여소</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {closestDistance ? `${Math.round(closestDistance * 1000)}m` : "-"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="glass-effect border-red-200 bg-red-50/80 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selected Station */}
          {selectedStation && (
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-3">선택된 대여소</h3>
              <BikeStationInfo
                station={selectedStation}
                distance={stationsWithDistance.find((s) => s.stationId === selectedStation.stationId)?.distance}
              />
            </div>
          )}

          {/* Stations List */}
          <div className={selectedStation ? "lg:col-span-2" : "lg:col-span-3"}>
            <StationsList
              stations={stations}
              userLocation={userLocation}
              onStationSelect={handleStationClick}
              stationsWithDistance={stationsWithDistance}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
