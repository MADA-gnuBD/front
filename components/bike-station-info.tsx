"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bike, MapPin, Clock, TrendingUp } from "lucide-react"
import type { BikeStation } from "@/lib/bike-api"
import { formatDistance } from "@/lib/utils"

interface BikeStationInfoProps {
  station: BikeStation
  distance?: number
  isClosest?: boolean
  hasMostBikes?: boolean
}

export function BikeStationInfo({ station, distance, isClosest, hasMostBikes }: BikeStationInfoProps) {
  const availabilityColor =
    station.parkingBikeTotCnt > 5
      ? "from-green-500 to-green-600"
      : station.parkingBikeTotCnt > 2
        ? "from-yellow-500 to-yellow-600"
        : "from-red-500 to-red-600"

  const availabilityBg =
    station.parkingBikeTotCnt > 5
      ? "bg-green-50 dark:bg-green-900/20"
      : station.parkingBikeTotCnt > 2
        ? "bg-yellow-50 dark:bg-yellow-900/20"
        : "bg-red-50 dark:bg-red-900/20"

  const availabilityText = station.parkingBikeTotCnt > 5 ? "여유" : station.parkingBikeTotCnt > 2 ? "보통" : "부족"

  return (
    <Card className="glass-effect border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${availabilityColor}`} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold truncate pr-2" title={station.stationName}>
            {station.stationName}
          </CardTitle>
          <div className="flex flex-col gap-1">
            {isClosest && (
              <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md">
                <MapPin className="w-3 h-3 mr-1" />
                가장 가까움
              </Badge>
            )}
            {hasMostBikes && (
              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-md">
                <TrendingUp className="w-3 h-3 mr-1" />
                최다 보유
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main bike count */}
        <div className={`${availabilityBg} rounded-xl p-4 transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 bg-gradient-to-r ${availabilityColor} rounded-full flex items-center justify-center shadow-lg`}
              >
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">이용 가능</p>
                <p className="text-xs text-gray-500">{availabilityText}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold bg-gradient-to-r ${availabilityColor} bg-clip-text text-transparent`}>
                {station.parkingBikeTotCnt}
              </p>
              <p className="text-xs text-gray-500">대</p>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="grid grid-cols-2 gap-3">
          {station.rackTotCnt > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">총 거치대</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{station.rackTotCnt}</p>
            </div>
          )}

          {distance !== undefined && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">거리</p>
              <p className="text-lg font-semibold text-blue-600">{formatDistance(distance)}</p>
            </div>
          )}
        </div>

        {/* Real-time indicator */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">실시간 정보</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
