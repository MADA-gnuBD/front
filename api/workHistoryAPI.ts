const WorkHistoryAPI = {
  // 작업 이력 조회
  getWorkHistory: async (params?: {
    userId?: string
    date?: string
  }, token?: string) => {
    const searchParams = new URLSearchParams()
    if (params?.userId) searchParams.append('userId', params.userId)
    if (params?.date) searchParams.append('date', params.date)

    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const url = `${baseUrl}/api/work-history${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    console.log('🌐 [WorkHistoryAPI] Spring API URL:', springApiUrl)
    console.log('🌐 [WorkHistoryAPI] Final API URL:', url)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // 토큰이 파라미터로 전달되지 않았으면 localStorage에서 가져오기
    const authToken = token || localStorage.getItem("auth_token")
    console.log('🔑 [WorkHistoryAPI] Token exists:', !!authToken)
    console.log('🔑 [WorkHistoryAPI] Token length:', authToken?.length || 0)
    console.log('🔑 [WorkHistoryAPI] Token preview:', authToken ? `${authToken.substring(0, 20)}...` : 'null')
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    } else {
      console.log('⚠️ [WorkHistoryAPI] No token found - 로그인이 필요합니다.')
      return []
    }

    console.log('📡 [WorkHistoryAPI] Request headers:', headers)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      console.log('📡 [WorkHistoryAPI] Response status:', response.status)
      console.log('📡 [WorkHistoryAPI] Response status text:', response.statusText)
      console.log('📡 [WorkHistoryAPI] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [WorkHistoryAPI] HTTP Error: ${response.status} ${response.statusText}`)
        console.error(`❌ [WorkHistoryAPI] Error body:`, errorText)
        
        // 403 에러인 경우 권한 문제임을 알림
        if (response.status === 403) {
          console.error('❌ [WorkHistoryAPI] 403 Forbidden - Spring 백엔드에서 권한 문제가 발생했습니다.')
          console.error('❌ [WorkHistoryAPI] SecurityConfig에서 /api/work-history가 인증된 사용자만 접근 가능하도록 설정되어 있는지 확인하세요.')
          console.error('❌ [WorkHistoryAPI] JWT 토큰이 유효한지 확인하세요.')
          console.error('❌ [WorkHistoryAPI] Spring 백엔드에서 WorkHistoryController가 구현되어 있는지 확인하세요.')
        }
        
        throw new Error(`작업 이력 조회 실패: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [WorkHistoryAPI] Response data:', data)
      console.log('✅ [WorkHistoryAPI] Data type:', typeof data)
      console.log('✅ [WorkHistoryAPI] Data length:', Array.isArray(data) ? data.length : 'Not an array')
      return data
    } catch (error) {
      console.error('❌ [WorkHistoryAPI] Fetch error:', error)
      console.error('❌ [WorkHistoryAPI] Error type:', typeof error)
      console.error('❌ [WorkHistoryAPI] Error message:', error instanceof Error ? error.message : String(error))
      throw error
    }
  },

  // 작업 이력 생성
  createWorkHistory: async (data: {
    workType: string
    description: string
    startTime: string
    endTime?: string
    location?: string
  }, token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const url = `${baseUrl}/api/work-history`
    
    console.log('🌐 [WorkHistoryAPI] Spring API URL:', springApiUrl)
    console.log('🌐 [WorkHistoryAPI] Final API URL:', url)
    console.log('📦 [WorkHistoryAPI] Original request data:', data)
    
    // Spring 백엔드의 CreateWorkHistoryRequest DTO 구조에 맞게 데이터 변환
    const transformedData = {
      userId: "", // Spring 백엔드에서 인증된 사용자 이메일로 설정
      stationName: data.location || "Unknown Station",
      stationId: "unknown", // 임시값
      action: data.workType,
      notes: data.description,
      completedAt: data.startTime
    }
    
    console.log('📦 [WorkHistoryAPI] Transformed request data:', transformedData)
    console.log('🔑 [WorkHistoryAPI] Token exists:', !!token)
    console.log('🔑 [WorkHistoryAPI] Token length:', token?.length || 0)
    console.log('🔑 [WorkHistoryAPI] Token preview:', token ? `${token.substring(0, 20)}...` : 'null')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
    
    console.log('📡 [WorkHistoryAPI] Request headers:', headers)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(transformedData),
    })

    console.log('📡 [WorkHistoryAPI] Response status:', response.status)
    console.log('📡 [WorkHistoryAPI] Response status text:', response.statusText)
    console.log('📡 [WorkHistoryAPI] Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [WorkHistoryAPI] HTTP Error: ${response.status} ${response.statusText}`)
      console.error(`❌ [WorkHistoryAPI] Error body:`, errorText)
      
      // 403 에러인 경우 권한 문제임을 알림
      if (response.status === 403) {
        console.error('❌ [WorkHistoryAPI] 403 Forbidden - Spring 백엔드에서 권한 문제가 발생했습니다.')
        console.error('❌ [WorkHistoryAPI] SecurityConfig에서 /api/work-history가 인증된 사용자만 접근 가능하도록 설정되어 있는지 확인하세요.')
        console.error('❌ [WorkHistoryAPI] JWT 토큰이 유효한지 확인하세요.')
        console.error('❌ [WorkHistoryAPI] Spring 백엔드에서 WorkHistoryController가 구현되어 있는지 확인하세요.')
        console.error('❌ [WorkHistoryAPI] POST /api/work-history 엔드포인트가 제대로 구현되어 있는지 확인하세요.')
      }
      
      throw new Error(`작업 이력 생성 실패: ${response.status}`)
    }

    const result = await response.json()
    console.log('✅ [WorkHistoryAPI] Response data:', result)
    return result
  },

  // 작업 이력 삭제
  deleteWorkHistory: async (id: string, token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const response = await fetch(`${baseUrl}/api/work-history/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`작업 이력 삭제 실패: ${response.status}`)
    }

    return response.json()
  },

  // 오늘 작업 수 조회
  getTodayWorkCount: async (token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const response = await fetch(`${baseUrl}/api/work-history/count/today`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`오늘 작업 수 조회 실패: ${response.status}`)
    }

    return response.json()
  },

  // 사용자 작업 이력 조회
  getUserWorkHistory: async (userId: string, token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const response = await fetch(`${baseUrl}/api/work-history?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`사용자 작업 이력 조회 실패: ${response.status}`)
    }

    return response.json()
  },
}

export default WorkHistoryAPI
