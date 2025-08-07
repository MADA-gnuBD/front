"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import AuthAPI from "@/api/authAPI"

interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user"
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  updateProfile: (data: {
    name: string
    email: string
    currentPassword?: string
    newPassword?: string
  }) => Promise<boolean>
  deleteAccount: () => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false) // 🆕 초기화 상태 추가

  // 🆕 토큰 만료 체크 및 자동 로그아웃 함수
  const handleTokenExpired = () => {
    console.log("🚨 [Auth] 토큰 만료 감지 - 자동 로그아웃")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    setUser(null)

    // 사용자에게 알림
    alert("로그인이 만료되었습니다. 다시 로그인해주세요.")

    // 로그인 페이지로 리다이렉트
    window.location.href = "/auth"
  }

  // 🆕 API 요청 래퍼 함수 (토큰 만료 자동 처리)
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("auth_token")
    
    // Next.js API 경로를 스프링 백엔드 경로로 변환
    const springUrl = url.replace("/api/", `${process.env.NEXT_PUBLIC_SPRING_API_URL}/api/`)

    const response = await fetch(springUrl, {
      ...options,
      headers: {
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    // 401 Unauthorized 응답 시 토큰 만료 처리
    if (response.status === 401) {
      console.log("🚨 [Auth] API 요청에서 401 응답 - 토큰 만료")
      handleTokenExpired()
      throw new Error("Token expired")
    }

    return response
  }

  useEffect(() => {
    // 🔥 초기화가 완료되지 않았을 때만 인증 체크 실행
    if (!isInitialized) {
      checkAuth()
    }

    // 🆕 주기적으로 토큰 유효성 검사 (5분마다) - 사용자가 있을 때만
    const tokenCheckInterval = setInterval(
      () => {
        if (user && isInitialized) {
          checkTokenValidity()
        }
      },
      5 * 60 * 1000,
    ) // 5분

    return () => clearInterval(tokenCheckInterval)
  }, [user, isInitialized])

  const checkAuth = async () => {
    try {
      console.log("🔍 [Auth] 인증 상태 확인 시작")
      setLoading(true)

      const token = localStorage.getItem("auth_token")
      if (!token) {
        console.log("❌ [Auth] 토큰 없음 - 비로그인 상태")
        setUser(null)
        setLoading(false)
        setIsInitialized(true)
        return
      }

      console.log("🔍 [Auth] 토큰 발견 - 서버 검증 중...")

      // AuthAPI를 사용하여 스프링 백엔드에서 사용자 정보 조회
      const authToken = localStorage.getItem("auth_token")
      if (!authToken) {
        console.error("토큰이 없습니다.")
        handleTokenExpired()
        return
      }

      try {
        const userData = await AuthAPI.getMe(authToken)
        console.log("✅ [Auth] 인증 성공:", userData.email)
        setUser({
          ...userData,
          role: userData.role || "user",
        })
      } catch (error) {
        console.error("❌ [Auth] 인증 실패:", error)
        handleTokenExpired()
      }
    } catch (error) {
      console.error("❌ [Auth] 인증 체크 실패:", error)
      if (error instanceof Error && error.message === "Token expired") {
        // 이미 handleTokenExpired에서 처리됨
        return
      }
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user_data")
      setUser(null)
    } finally {
      setLoading(false)
      setIsInitialized(true) // 🔥 초기화 완료 표시
    }
  }

  // 🆕 토큰 유효성 검사 함수
  const checkTokenValidity = async () => {
    try {
      console.log("🔍 [Auth] 토큰 유효성 주기적 검사")
      const authToken = localStorage.getItem("auth_token")
      if (!authToken) {
        console.log("🚨 [Auth] 토큰이 없음")
        handleTokenExpired()
        return
      }

      // AuthAPI를 사용하여 스프링 백엔드에서 토큰 유효성 검사
      await AuthAPI.getMe(authToken)
      console.log("✅ [Auth] 토큰 유효성 검사 통과")
    } catch (error) {
      console.error("🚨 [Auth] 토큰 유효성 검사 오류:", error)
      handleTokenExpired()
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("🔐 [Auth] 로그인 시도:", email)

      // AuthAPI를 사용하여 스프링 백엔드에 로그인 요청
      const response = await AuthAPI.login(email, password)

      if (response.success && response.user) {
        localStorage.setItem("auth_token", response.token)
        localStorage.setItem("user_data", JSON.stringify(response.user))
        setUser({
          ...response.user,
          role: response.user.role || "user",
        })
        console.log("✅ [Auth] 로그인 성공:", response.user.email)
        return true
      } else {
        console.error("❌ [Auth] 로그인 실패:", response.message)
        return false
      }
    } catch (error) {
      console.error("❌ [Auth] 로그인 오류:", error)
      return false
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      console.log("📝 [Auth] 회원가입 시도:", email)

      // AuthAPI를 사용하여 스프링 백엔드에 회원가입 요청
      const response = await AuthAPI.register(email, password, name)

      if (response.success && response.user) {
        localStorage.setItem("auth_token", response.token)
        localStorage.setItem("user_data", JSON.stringify(response.user))
        setUser({
          ...response.user,
          role: response.user.role || "user",
        })
        console.log("✅ [Auth] 회원가입 성공:", response.user.email)
        return true
      } else {
        console.error("❌ [Auth] 회원가입 실패:", response.message)
        return false
      }
    } catch (error) {
      console.error("❌ [Auth] 회원가입 오류:", error)
      return false
    }
  }

  const updateProfile = async (data: {
    name: string
    email: string
    currentPassword?: string
    newPassword?: string
  }): Promise<boolean> => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        console.error("토큰이 없습니다.")
        return false
      }

      // AuthAPI를 사용하여 스프링 백엔드에 프로필 업데이트 요청
      const response = await AuthAPI.updateProfile(data, token)

      if (response.success) {
        const newUserData = {
          ...response.user,
          role: response.user.role || "user",
        }
        localStorage.setItem("user_data", JSON.stringify(newUserData))
        setUser(newUserData)
        return true
      }
      return false
    } catch (error) {
      console.error("Profile update failed:", error)
      return false
    }
  }

  const deleteAccount = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        console.error("토큰이 없습니다.")
        return false
      }

      // AuthAPI를 사용하여 스프링 백엔드에 계정 삭제 요청
      const response = await AuthAPI.deleteAccount(token)

      if (response.success) {
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user_data")
        setUser(null)
        return true
      }
      return false
    } catch (error) {
      console.error("Account deletion failed:", error)
      return false
    }
  }

  const logout = () => {
    console.log("🚪 [Auth] 수동 로그아웃")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, deleteAccount, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// 🆕 API 요청을 위한 유틸리티 함수 export
export const useApiRequest = () => {
  const handleTokenExpired = () => {
    console.log("🚨 [API] 토큰 만료 감지 - 자동 로그아웃")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")

    alert("로그인이 만료되었습니다. 다시 로그인해주세요.")
    window.location.href = "/auth"
  }

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("auth_token")
    
    // Next.js API 경로를 스프링 백엔드 경로로 변환
    const springUrl = url.replace("/api/", `${process.env.NEXT_PUBLIC_SPRING_API_URL}/api/`)

    const response = await fetch(springUrl, {
      ...options,
      headers: {
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (response.status === 401) {
      console.log("🚨 [API] 401 응답 - 토큰 만료")
      handleTokenExpired()
      throw new Error("Token expired")
    }

    return response
  }

  return { apiRequest }
}
