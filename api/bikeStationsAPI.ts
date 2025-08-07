import { type BikeStation } from "@/lib/bike-api"

// Spring 백엔드에서 받은 데이터를 BikeStation 형식으로 변환하는 함수
const transformBikeStations = (data: any[]): BikeStation[] => {
    return data.map((station: any) => ({
        stationId: station.stationId,
        stationName: station.stationName,
        parkingBikeTotCnt: parseInt(station.parkingBikeTotCnt) || 0,
        rackTotCnt: 0, // Spring 백엔드에 rackTotCnt 필드가 없으므로 기본값 0
        stationLatitude: parseFloat(station.latitude) || 0, // latitude -> stationLatitude
        stationLongitude: parseFloat(station.longitude) || 0, // longitude -> stationLongitude
        shared: parseInt(station.shared || "0"),
    }))
}

const BikeStationsAPI = {
    getBikeStations: async (): Promise<BikeStation[]> => {
        try {
            console.log('🌐 [BikeStationsAPI] Spring 백엔드에서 따릉이 데이터 요청')
            
            // Spring 백엔드 API URL
            const url = 'http://localhost:8080/bike-inventory/latest'
            
            console.log('📡 [BikeStationsAPI] 요청 URL:', url)
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            })
            
            console.log('📡 [BikeStationsAPI] Response status:', response.status)
            
            if (!response.ok) {
                const errorText = await response.text()
                console.error(`❌ [BikeStationsAPI] HTTP Error: ${response.status} ${response.statusText}`)
                console.error(`❌ [BikeStationsAPI] Error body:`, errorText)
                throw new Error(`Spring 백엔드 API 오류: ${response.status} - ${errorText}`)
            }
            
            const data = await response.json()
            console.log('📦 [BikeStationsAPI] Spring 백엔드 응답 데이터:', data)
            
            // Spring 백엔드 응답 데이터를 BikeStation 형식으로 변환
            const bikeStations = transformBikeStations(data)
            
            console.log('✅ [BikeStationsAPI] 변환된 자전거 정류소 데이터:', bikeStations.length, '개')
            return bikeStations
        } catch (error) {
            console.error('❌ [BikeStationsAPI] 자전거 정류소 데이터 가져오기 실패:', error)
            console.error('❌ [BikeStationsAPI] Error type:', typeof error)
            console.error('❌ [BikeStationsAPI] Error message:', error instanceof Error ? error.message : String(error))
            console.error('❌ [BikeStationsAPI] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
            
            // 더 자세한 에러 정보 제공
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Spring 백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
            }
            
            throw new Error('자전거 정류소 정보를 가져올 수 없습니다.')
        }
    }
}

export default BikeStationsAPI