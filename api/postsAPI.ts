const PostsAPI = {
  // 게시글 목록 조회
  getPosts: async (params?: {
    category?: string
    search?: string
    sort?: string
    author?: string
    page?: number
    size?: number
  }, token?: string) => { // Added token parameter
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.append('category', params.category)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.sort) searchParams.append('sort', params.sort)
    if (params?.author) searchParams.append('author', params.author)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.size) searchParams.append('size', params.size.toString())

    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const url = `${baseUrl}/api/posts${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    console.log('🌐 [PostsAPI] Spring API URL:', springApiUrl)
    console.log('🌐 [PostsAPI] Final API URL:', url)
    console.log('📦 [PostsAPI] Request params:', params)
    console.log('📦 [PostsAPI] author param:', params?.author)
    console.log('📦 [PostsAPI] searchParams:', searchParams.toString())

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // 토큰이 파라미터로 전달되지 않았으면 localStorage에서 가져오기
    const authToken = token || localStorage.getItem("auth_token")
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    console.log('📡 [PostsAPI] Request headers:', headers)

    const response = await fetch(url, {
      method: 'GET',
      headers, // Used headers
    })

    console.log('📡 [PostsAPI] Response status:', response.status)
    console.log('📡 [PostsAPI] Response status text:', response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [PostsAPI] HTTP Error: ${response.status} ${response.statusText}`)
      console.error(`❌ [PostsAPI] Error body:`, errorText)
      throw new Error(`게시글 목록 조회 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ [PostsAPI] Response data:', data)
    return data
  },

  // 게시글 상세 조회
  getPost: async (id: string, token?: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // 토큰이 파라미터로 전달되지 않았으면 localStorage에서 가져오기
    const authToken = token || localStorage.getItem("auth_token")
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`게시글 조회 실패: ${response.status}`)
    }

    return response.json()
  },

  // 게시글 생성
  createPost: async (data: {
    title: string
    content: string
    category: string
  }, token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const response = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`게시글 생성 실패: ${response.status}`)
    }

    return response.json()
  },

  // 게시글 수정
  updatePost: async (id: string, data: {
    title: string
    content: string
    category: string
  }, token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`게시글 수정 실패: ${response.status}`)
    }

    return response.json()
  },

  // 게시글 삭제
  deletePost: async (id: string, token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    
    console.log('🔍 [PostsAPI] 게시글 삭제 요청:', {
      url: `${baseUrl}/api/posts/${id}`,
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + "...",
      tokenEnd: "..." + token.substring(token.length - 10),
    })
    
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('📡 [PostsAPI] 삭제 응답 상태:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [PostsAPI] 삭제 오류 응답:', errorText)
      throw new Error(`게시글 삭제 실패: ${response.status}`)
    }

    // 삭제 성공 시 빈 객체 반환 (Spring 백엔드가 void를 반환하므로)
    return { success: true }
  },

  // 게시글 좋아요
  likePost: async (id: string, token: string) => {
    const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
    // URL 끝에 슬래시가 있으면 제거
    const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
    const response = await fetch(`${baseUrl}/api/posts/${id}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`게시글 좋아요 실패: ${response.status}`)
    }

    return response.json()
  },
}

export default PostsAPI
