"use client"

import { useEffect, useRef, useState } from "react"
import type { BikeStation } from "@/lib/bike-api"

declare global {
  interface Window {
    kakao: any
  }
}

interface KakaoMapProps {
  stations: BikeStation[]
  onStationClick: (station: BikeStation) => void
  selectedStation: BikeStation | null
  userLocation: { lat: number; lng: number } | null
  priorityStations?: BikeStation[]
  completedStations?: Set<string>
  workQueue?: string[]
}

const markerLegend = [
  { color: "#22C55E", label: "정상(충분)" },
  { color: "#F59E0B", label: "재고 부족(3대 이하) / 작업 대기" },
  { color: "#8B5CF6", label: "작업 완료" },
  { color: "#EF4444", label: "빈 대여소(0대)" },
]

export function KakaoMap({
  stations,
  onStationClick,
  selectedStation,
  userLocation,
  priorityStations = [],
  completedStations = new Set(),
  workQueue = [],
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const customOverlayRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const script = document.createElement("script")
    script.async = true
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`
    document.head.appendChild(script)
    script.onload = () => {
      window.kakao.maps.load(() => setIsLoaded(true))
    }
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapContainer.current) return
    console.log('🗺️ [KakaoMap] 지도 초기화 시작')
    const options = {
      center: new window.kakao.maps.LatLng(37.5665, 126.978),
      level: 3,
    }
    mapRef.current = new window.kakao.maps.Map(mapContainer.current, options)
    console.log('🗺️ [KakaoMap] 지도 초기화 완료')
  }, [isLoaded])

  useEffect(() => {
    console.log('🗺️ [KakaoMap] 마커 업데이트:', {
      mapExists: !!mapRef.current,
      stationsCount: stations.length,
      stations: stations.slice(0, 3).map(s => ({ 
        name: s.stationName, 
        bikes: s.parkingBikeTotCnt,
        lat: s.stationLatitude,
        lng: s.stationLongitude
      }))
    })
    
    if (!mapRef.current || !stations.length) {
      console.log('🗺️ [KakaoMap] 마커 생성 조건 불충족:', {
        mapExists: !!mapRef.current,
        stationsCount: stations.length
      })
      return
    }
    
    console.log('🗺️ [KakaoMap] 기존 마커 제거:', markersRef.current.length, '개')
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    console.log('🗺️ [KakaoMap] 새 마커 생성 시작:', stations.length, '개')
    stations.forEach((station, index) => {
      const markerPosition = new window.kakao.maps.LatLng(station.stationLatitude, station.stationLongitude)

      // 마커 색상 결정 - 우선순위: 완료 > 빈 대여소(0대) > 작업 대기 > 재고 부족
      let markerColor = "#22C55E" // 기본 녹색 (정상)

      // 디버깅을 위한 콘솔 로그 추가
      console.log(`🗺️ [KakaoMap] 마커 ${index + 1}/${stations.length}: ${station.stationName}, Bikes: ${station.parkingBikeTotCnt}, Lat: ${station.stationLatitude}, Lng: ${station.stationLongitude}`)

      // 우선순위 명확하게 설정
      if (completedStations.has(station.stationId)) {
        markerColor = "#8B5CF6" // 보라색 (완료)
        console.log(`- Completed station: ${station.stationName}`)
      } else if (station.parkingBikeTotCnt === 0) {
        markerColor = "#EF4444" // 빨간색 (빈 대여소)
        console.log(`- Empty station: ${station.stationName}`)
      } else if (workQueue.includes(station.stationId)) {
        markerColor = "#F59E0B" // 주황색 (작업 대기)
        console.log(`- Work queue station: ${station.stationName}`)
      } else if (station.parkingBikeTotCnt <= 3) {
        markerColor = "#F59E0B" // 주황색 (재고 부족)
        console.log(`- Low stock station: ${station.stationName}`)
      }

      // SVG 마커 - 아이콘 제거, 색깔만 사용
      const svgString = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="${markerColor}" stroke="white" strokeWidth="3"/>
</svg>
`.trim()
      const imageSrc = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`
      const imageSize = new window.kakao.maps.Size(40, 40)
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize)

      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        image: markerImage,
      })

      marker.setMap(mapRef.current)

      // 오버레이 스타일: 박스 넘침 막는 최소 스타일만!
      const infoContent = `
        <div style="
          background: #fff; 
          border-radius: 8px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          padding: 10px 18px; 
          min-width: 160px; 
          max-width: 320px; 
          font-size: 13px; 
          color: #222;
          border: 1px solid #d5d5d5; 
          box-sizing: border-box;
          word-break: break-all; 
          overflow-wrap: break-word; 
          white-space: normal; 
          line-height: 1.5;
        ">
          <div style="font-weight:bold; margin-bottom:4px; max-width:220px; word-break:break-all; overflow-wrap:break-word; white-space:normal;">
            ${station.stationName}
          </div>
          <div>자전거 ${station.parkingBikeTotCnt}대 / 거치대 ${station.rackTotCnt}대</div>
          ${completedStations.has(station.stationId) ? '<div style="color:#8B5CF6;font-weight:bold;">작업 완료</div>' : ""}
          ${workQueue.includes(station.stationId) ? '<div style="color:#F59E0B;font-weight:bold;">작업 대기</div>' : ""}
        </div>
      `

      // 겹침 방지 핵심: 오버레이 한 번만, 새로 열 때마다 기존 것 닫고 새 것만 표시
      window.kakao.maps.event.addListener(marker, "mouseover", () => {
        if (customOverlayRef.current) customOverlayRef.current.setMap(null)
        customOverlayRef.current = new window.kakao.maps.CustomOverlay({
          content: infoContent,
          map: mapRef.current,
          position: markerPosition,
          yAnchor: 1.15,
          zIndex: 11,
        })
      })
      window.kakao.maps.event.addListener(marker, "mouseout", () => {
        if (customOverlayRef.current) customOverlayRef.current.setMap(null)
      })
      window.kakao.maps.event.addListener(marker, "click", () => {
        onStationClick(station)
      })

      markersRef.current.push(marker)
    })
    
    console.log('🗺️ [KakaoMap] 마커 생성 완료:', markersRef.current.length, '개')
  }, [stations, onStationClick, completedStations, workQueue])

  // 아래는 그대로 (유저 마커, 지도 이동, 범례 UI)
  useEffect(() => {
    if (!mapRef.current || !userLocation) return
    if (userMarkerRef.current) userMarkerRef.current.setMap(null)
    const userPosition = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
    const svgString = `
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="13" fill="#2563EB" stroke="white" strokeWidth="3"/>
</svg>
`.trim()
    const userImageSrc = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`
    const userImageSize = new window.kakao.maps.Size(30, 30)
    const userMarkerImage = new window.kakao.maps.MarkerImage(userImageSrc, userImageSize)
    userMarkerRef.current = new window.kakao.maps.Marker({
      position: userPosition,
      image: userMarkerImage,
    })
    userMarkerRef.current.setMap(mapRef.current)
    mapRef.current.setCenter(userPosition)
  }, [userLocation])

  useEffect(() => {
    if (!mapRef.current || !selectedStation) return
    const selectedPosition = new window.kakao.maps.LatLng(
      selectedStation.stationLatitude,
      selectedStation.stationLongitude,
    )
    mapRef.current.setCenter(selectedPosition)
    mapRef.current.setLevel(2)
  }, [selectedStation])

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
    )
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
  )
}
