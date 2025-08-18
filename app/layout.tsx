import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { WorkHistoryProvider } from "@/contexts/work-history-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VeloNext",
  description: "서울시 따릉이 실시간 관리 및 커뮤니티 플랫폼",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <WorkHistoryProvider>{children}</WorkHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
