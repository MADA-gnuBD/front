"use client"

import { Bike } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Bike className="w-10 h-10 text-white animate-bounce" />
          </div>
          <div className="absolute inset-0 w-20 h-20 border-4 border-blue-200 rounded-full animate-ping" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          VeloNext 데이터 로딩 중...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">잠시만 기다려주세요</p>

        {/* Loading bars */}
        <div className="flex justify-center gap-1 mt-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-8 bg-gradient-to-t from-blue-500 to-purple-600 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
