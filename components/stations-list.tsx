"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BikeStationInfo } from "./bike-station-info"
import type { BikeStation } from "@/lib/bike-api"
import { Bike, MapPin, List, Maximize2, Minimize2, Filter } from "lucide-react"

interface StationsListProps {
  stations: BikeStation[]
  userLocation: { lat: number; lng: number } | null
  onStationSelect: (station: BikeStation) => void
  stationsWithDistance: Array<BikeStation & { distance: number }>
}

export function StationsList({ stations, userLocation, onStationSelect, stationsWithDistance }: StationsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const stationsWithMostBikes = [...stations].sort((a, b) => b.parkingBikeTotCnt - a.parkingBikeTotCnt).slice(0, 10)
  const closestStations = [...stationsWithDistance].sort((a, b) => a.distance - b.distance).slice(0, 10)

  return (
    <Card className="glass-effect border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-white/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <List className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-lg">따릉이 대여소</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">실시간 현황</p>
            </div>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="glass-effect border-0 hover:bg-white/20 transition-all duration-300"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="closest" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass-effect border-0 p-1">
            <TabsTrigger
              value="closest"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all duration-300"
            >
              <MapPin className="w-4 h-4" />
              가까운 순
            </TabsTrigger>
            <TabsTrigger
              value="most-bikes"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white transition-all duration-300"
            >
              <Bike className="w-4 h-4" />
              보유량 순
            </TabsTrigger>
          </TabsList>

          <TabsContent value="closest" className="space-y-3 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">가까운 대여소 순으로 정렬</span>
            </div>
            <div
              className={`space-y-3 ${!isExpanded ? "max-h-96 overflow-y-auto" : ""} scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600`}
            >
              {userLocation ? (
                closestStations.map((station, index) => (
                  <div
                    key={station.stationId}
                    className="cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50 p-2 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => onStationSelect(station)}
                  >
                    <BikeStationInfo station={station} distance={station.distance} isClosest={index === 0} />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">위치 정보를 허용해주세요</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">가까운 대여소를 찾아드릴게요</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="most-bikes" className="space-y-3 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">자전거 보유량 순으로 정렬</span>
            </div>
            <div
              className={`space-y-3 ${!isExpanded ? "max-h-96 overflow-y-auto" : ""} scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600`}
            >
              {stationsWithMostBikes.map((station, index) => {
                const stationWithDistance = stationsWithDistance.find((s) => s.stationId === station.stationId)
                return (
                  <div
                    key={station.stationId}
                    className="cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50 p-2 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => onStationSelect(station)}
                  >
                    <BikeStationInfo
                      station={station}
                      distance={stationWithDistance?.distance}
                      hasMostBikes={index === 0}
                    />
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
