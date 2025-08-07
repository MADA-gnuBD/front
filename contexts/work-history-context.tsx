"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import WorkHistoryAPI from "@/api/workHistoryAPI"

export interface WorkHistoryItem {
  id: string
  stationName: string
  stationId: string
  action: string
  completedAt: Date
  notes?: string
  userId: string
}

interface WorkHistoryContextType {
  workHistory: WorkHistoryItem[]
  addWorkHistory: (item: Omit<WorkHistoryItem, "id" | "completedAt" | "userId">) => Promise<void>
  clearWorkHistory: () => void
  getTodayCompletedCount: (userId: string) => number
  getTodayCompletedItems: (userId: string) => WorkHistoryItem[]
  refreshWorkHistory: () => Promise<void>
  loading: boolean
}

const WorkHistoryContext = createContext<WorkHistoryContextType | undefined>(undefined)

export function WorkHistoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workHistory, setWorkHistory] = useState<WorkHistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWorkHistory = async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log("🔍 [WorkHistory] 작업 내역 로딩 시작")
      console.log("🔍 [WorkHistory] User:", user)

      const token = localStorage.getItem("auth_token")
      if (!token) {
        console.error("토큰이 없습니다.")
        return
      }

      console.log("🔍 [WorkHistory] Token exists:", !!token)
      console.log("🔍 [WorkHistory] Token length:", token.length)

      // WorkHistoryAPI를 사용하여 스프링 백엔드에서 작업 내역 가져오기
      const data = await WorkHistoryAPI.getWorkHistory(undefined, token)
      console.log("📦 [WorkHistory] Raw data from Spring:", data)
      console.log("📦 [WorkHistory] Data type:", typeof data)
      console.log("📦 [WorkHistory] Data length:", Array.isArray(data) ? data.length : 'Not an array')
      
      const formattedData = data.map((item: any) => ({
        ...item,
        completedAt: new Date(item.completedAt),
        userId: item.userId || user.email, // userId가 없으면 현재 사용자 이메일 사용
      }))
      
      console.log("📦 [WorkHistory] Formatted data:", formattedData.map((item: any) => ({
        id: item.id,
        action: item.action,
        completedAt: item.completedAt.toISOString(),
        userId: item.userId,
        stationName: item.stationName
      })))
      setWorkHistory(formattedData)
      console.log("✅ [WorkHistory] 작업 내역 로딩 완료:", formattedData.length, "개")
    } catch (error) {
      console.error("❌ [WorkHistory] 작업 내역 로딩 실패:", error)
      console.error("❌ [WorkHistory] Error type:", typeof error)
      console.error("❌ [WorkHistory] Error message:", error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchWorkHistory()
    }
  }, [user])

  const addWorkHistory = async (item: Omit<WorkHistoryItem, "id" | "completedAt" | "userId">) => {
    if (!user) return

    try {
      console.log("📝 [WorkHistory] 작업 내역 추가 시작")
      console.log("📝 [WorkHistory] item:", item)

      const token = localStorage.getItem("auth_token")
      if (!token) {
        console.error("토큰이 없습니다.")
        return
      }

      // WorkHistoryAPI를 사용하여 스프링 백엔드에 작업 내역 추가
      const newItem = await WorkHistoryAPI.createWorkHistory({
        workType: item.action,
        description: item.notes || "",
        startTime: new Date().toISOString(),
        location: item.stationName,
      }, token)

      const formattedItem = {
        ...newItem,
        completedAt: new Date(newItem.completedAt),
        userId: user.email, // userId 명시적으로 설정
      }
      console.log("✅ [WorkHistory] 작업 내역 추가 완료:", {
        id: formattedItem.id,
        action: formattedItem.action,
        completedAt: formattedItem.completedAt.toISOString(),
        userId: formattedItem.userId,
        stationName: formattedItem.stationName
      })
      
             // 즉시 상태 업데이트 - 새로운 아이템을 맨 앞에 추가
       setWorkHistory((prev) => {
         const updated = [formattedItem, ...prev]
         console.log("🔄 [WorkHistory] 상태 업데이트:", updated.length, "개")
         console.log("🔄 [WorkHistory] 새 아이템:", {
           id: formattedItem.id,
           action: formattedItem.action,
           completedAt: formattedItem.completedAt.toISOString(),
           userId: formattedItem.userId
         })
         console.log("🔄 [WorkHistory] 이전 상태 길이:", prev.length)
         console.log("🔄 [WorkHistory] 업데이트된 상태 길이:", updated.length)
         return updated
       })
    } catch (error) {
      console.error("❌ [WorkHistory] 작업 내역 추가 실패:", error)
    }
  }

  const clearWorkHistory = () => {
    setWorkHistory([])
  }

      const getTodayCompletedCount = useCallback((userId: string) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      console.log("🔍 [WorkHistory] getTodayCompletedCount 호출")
      console.log("🔍 [WorkHistory] userId:", userId)
      console.log("🔍 [WorkHistory] today:", today.toISOString())
      console.log("🔍 [WorkHistory] tomorrow:", tomorrow.toISOString())
      console.log("🔍 [WorkHistory] workHistory length:", workHistory.length)
      console.log("🔍 [WorkHistory] 현재 시간:", new Date().toISOString())
      console.log("🔍 [WorkHistory] 현재 날짜만:", new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString())

    // 모든 작업을 로그로 출력
    console.log("🔍 [WorkHistory] All items:", workHistory.map(item => ({
      id: item.id,
      action: item.action,
      completedAt: item.completedAt.toISOString(),
      userId: item.userId
    })))

    const todayItems = workHistory.filter((item) => {
      // 날짜 비교를 더 유연하게 수행
      const itemDate = new Date(item.completedAt)
      const today = new Date()
      
      // 날짜만 비교 (시간 제외) - 더 유연한 방식
      const itemDateStr = itemDate.toDateString()
      const todayDateStr = today.toDateString()
      
      const isToday = itemDateStr === todayDateStr
      const isUserMatch = item.userId === userId
      
      console.log("🔍 [WorkHistory] Item:", {
        id: item.id,
        completedAt: item.completedAt.toISOString(),
        userId: item.userId,
        isToday,
        isUserMatch,
        itemDateStr,
        todayDateStr,
        dateMatch: itemDateStr === todayDateStr
      })
      
      return isUserMatch && isToday
    })

    console.log("✅ [WorkHistory] Today completed count:", todayItems.length)
    console.log("✅ [WorkHistory] Today items:", todayItems.map(item => ({
      id: item.id,
      action: item.action,
      completedAt: item.completedAt.toISOString()
    })))
    return todayItems.length
  }, [workHistory])

  const getTodayCompletedItems = useCallback((userId: string) => {
    const today = new Date()

    return workHistory.filter((item) => {
      const itemDate = new Date(item.completedAt)
      
      // 날짜만 비교 (시간 제외)
      const itemYear = itemDate.getFullYear()
      const itemMonth = itemDate.getMonth()
      const itemDay = itemDate.getDate()
      
      const todayYear = today.getFullYear()
      const todayMonth = today.getMonth()
      const todayDay = today.getDate()
      
      const isToday = itemYear === todayYear && itemMonth === todayMonth && itemDay === todayDay
      
      return item.userId === userId && isToday
    })
  }, [workHistory])

  const refreshWorkHistory = async () => {
    await fetchWorkHistory()
  }

  return (
    <WorkHistoryContext.Provider
      value={{
        workHistory,
        addWorkHistory,
        clearWorkHistory,
        getTodayCompletedCount,
        getTodayCompletedItems,
        refreshWorkHistory,
        loading,
      }}
    >
      {children}
    </WorkHistoryContext.Provider>
  )
}

export function useWorkHistory() {
  const context = useContext(WorkHistoryContext)
  if (context === undefined) {
    throw new Error("useWorkHistory must be used within a WorkHistoryProvider")
  }
  return context
}
