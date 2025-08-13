// app/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { PublicMap } from "@/components/public-map"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // 로그인 시 관리자 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && user && !isRedirecting) {
      setIsRedirecting(true)
      setTimeout(() => router.push("/admin"), 100)
    }
  }, [user, loading, router, isRedirecting])

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800">
            {isRedirecting ? "관리자 페이지로 이동 중..." : "로딩 중..."}
          </h2>
          <p className="text-gray-600 mt-2">
            {isRedirecting ? "잠시만 기다려주세요" : "사용자 정보를 확인하고 있습니다"}
          </p>
        </div>
      </div>
    )
  }

  // 비로그인 공개 지도 (AI 버튼/핸들러 전부 제거)
  if (!user) {
    return (
      <div className="relative">
        <PublicMap />
      </div>
    )
  }

  // 안전장치 (잠깐 보일 수 있는 상태)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
        <h2 className="text-xl font-semibold text-gray-800">처리 중...</h2>
      </div>
    </div>
  )
}
