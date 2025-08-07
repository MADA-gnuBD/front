const AuthAPI = {
  // 로그인
  login: async (email: string, password: string) => {
    try {
      // 직접 Spring 백엔드 호출
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      console.log('🔧 [AuthAPI] Spring API URL:', springApiUrl)
      
      // URL 끝에 슬래시가 있으면 제거
      const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
      const apiUrl = `${baseUrl}/api/users/login`
      console.log('🔧 [AuthAPI] Final API URL:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      console.log('📡 [AuthAPI] Login response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [AuthAPI] Login error:', errorData)
        throw new Error(errorData.error || '로그인에 실패했습니다.')
      }

      const data = await response.json()
      console.log('✅ [AuthAPI] Login success:', data)
      return data
    } catch (error) {
      console.error('로그인 실패:', error)
      throw error
    }
  },

  // 회원가입
  register: async (email: string, password: string, name: string) => {
    try {
      // 직접 Spring 백엔드 호출
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      console.log('🔧 [AuthAPI] Spring API URL:', springApiUrl)
      
      // URL 끝에 슬래시가 있으면 제거
      const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
      const apiUrl = `${baseUrl}/api/users/signup`
      console.log('🔧 [AuthAPI] Final API URL:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      })

      console.log('📡 [AuthAPI] Register response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [AuthAPI] Register error:', errorData)
        throw new Error(errorData.error || '회원가입에 실패했습니다.')
      }

      const data = await response.json()
      console.log('✅ [AuthAPI] Register success:', data)
      return data
    } catch (error) {
      console.error('회원가입 실패:', error)
      throw error
    }
  },

  // 프로필 업데이트
  updateProfile: async (data: {
    name: string
    email: string
    currentPassword?: string
    newPassword?: string
  }, token: string) => {
    try {
      // 직접 Spring 백엔드 호출
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const response = await fetch(`${springApiUrl}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '프로필 업데이트에 실패했습니다.')
      }

      return response.json()
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      throw error
    }
  },

  // 계정 삭제
  deleteAccount: async (token: string) => {
    try {
      // 직접 Spring 백엔드 호출
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const response = await fetch(`${springApiUrl}/api/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '계정 삭제에 실패했습니다.')
      }

      return response.json()
    } catch (error) {
      console.error('계정 삭제 실패:', error)
      throw error
    }
  },

  // 토큰 갱신
  refreshToken: async (refreshToken: string) => {
    try {
      // 직접 Spring 백엔드 호출
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const response = await fetch(`${springApiUrl}/api/users/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '토큰 갱신에 실패했습니다.')
      }

      return response.json()
    } catch (error) {
      console.error('토큰 갱신 실패:', error)
      throw error
    }
  },

  // 사용자 정보 조회
  getMe: async (token: string) => {
    try {
      // 직접 Spring 백엔드 호출
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const response = await fetch(`${springApiUrl}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('사용자 정보 조회에 실패했습니다.')
      }

      return response.json()
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
      throw error
    }
  }
}

export default AuthAPI