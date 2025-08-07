"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, X, Navigation } from "lucide-react"
import type { BikeStation } from "@/lib/bike-api"
import { calculateDistance, formatDistance } from "@/lib/utils"

interface WorkQueueProps {
  workQueue: string[]
  stations: BikeStation[]
  onRemove: (stationId: string) => void
  onComplete: (stationId: string) => void
  userLocation: { lat: number; lng: number } | null
}

export function WorkQueue({ workQueue, stations, onRemove, onComplete, userLocation }: WorkQueueProps) {
  const queueStations = workQueue.map((id) => stations.find((s) => s.stationId === id)).filter(Boolean) as BikeStation[]

  const stationsWithDistance = userLocation
    ? queueStations
        .map((station) => ({
          ...station,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            station.stationLatitude,
            station.stationLongitude,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
    : queueStations

  return (
    <Card className="glass-effect border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
        <CardTitle className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <span>작업 대기열</span>
            <Badge className="ml-2 bg-blue-100 text-blue-800">{workQueue.length}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {workQueue.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>작업 대기 중인 대여소가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stationsWithDistance.map((station, index) => (
              <div key={station.stationId} className="bg-white/50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <h4 className="font-medium text-sm truncate">{station.stationName}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>🚲 {station.parkingBikeTotCnt}대</span>
                      {userLocation && (
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {formatDistance(
                            calculateDistance(
                              userLocation.lat,
                              userLocation.lng,
                              station.stationLatitude,
                              station.stationLongitude,
                            ),
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onComplete(station.stationId)}
                      className="h-8 w-8 p-0 bg-green-50 hover:bg-green-100 border-green-200"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemove(station.stationId)}
                      className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 border-red-200"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
