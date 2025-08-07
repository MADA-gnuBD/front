"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Plus, CheckCircle } from "lucide-react"
import type { BikeStation } from "@/lib/bike-api"

interface AdminPanelProps {
  selectedStation: BikeStation | null
  priorityStations: BikeStation[]
  onAddToQueue: (stationId: string) => void
  onMarkCompleted: (stationId: string) => void
  workQueue: string[]
  completedStations: Set<string>
}

export function AdminPanel({
  selectedStation,
  priorityStations,
  onAddToQueue,
  onMarkCompleted,
  workQueue,
  completedStations,
}: AdminPanelProps) {
  return (
    <div className="space-y-6">
      {/* Selected Station */}
      {selectedStation && (
        <Card className="glass-effect border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-white/20">
            <CardTitle className="text-lg">선택된 대여소</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-semibold">{selectedStation.stationName}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">현재 자전거</p>
                  <p className="text-xl font-bold text-blue-600">{selectedStation.parkingBikeTotCnt}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">총 거치대</p>
                  <p className="text-xl font-bold text-gray-700">{selectedStation.rackTotCnt}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {!workQueue.includes(selectedStation.stationId) &&
                  !completedStations.has(selectedStation.stationId) && (
                    <Button
                      onClick={() => onAddToQueue(selectedStation.stationId)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      작업 추가
                    </Button>
                  )}

                {workQueue.includes(selectedStation.stationId) && (
                  <Button
                    onClick={() => onMarkCompleted(selectedStation.stationId)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    완료 처리
                  </Button>
                )}

                {completedStations.has(selectedStation.stationId) && (
                  <Badge className="flex-1 justify-center bg-green-100 text-green-800">✅ 작업 완료</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Stations */}
      <Card className="glass-effect border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-white/20">
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            우선순위 대여소
            <Badge className="bg-red-100 text-red-800">{priorityStations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {priorityStations.slice(0, 10).map((station) => (
              <div key={station.stationId} className="bg-white/50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm truncate mb-1">{station.stationName}</h4>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={station.parkingBikeTotCnt === 0 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {station.parkingBikeTotCnt === 0 ? "빈 대여소" : "재고 부족"}
                      </Badge>
                      <span className="text-xs text-gray-600">🚲 {station.parkingBikeTotCnt}대</span>
                    </div>
                  </div>

                  {!workQueue.includes(station.stationId) && !completedStations.has(station.stationId) && (
                    <Button
                      size="sm"
                      onClick={() => onAddToQueue(station.stationId)}
                      className="ml-2 h-8 bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}

                  {workQueue.includes(station.stationId) && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">대기중</Badge>
                  )}

                  {completedStations.has(station.stationId) && (
                    <Badge className="ml-2 bg-green-100 text-green-800 text-xs">완료</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
