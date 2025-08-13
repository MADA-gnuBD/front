"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import AuthAPI from "@/api/authAPI"

import { Bike, Mail, Lock, User, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function AuthPage() {
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({ email: "", password: "", name: "", confirmPassword: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const router = useRouter()

/* 로그인인
  const handleLogin1 = async (e: React.FormEvent) => {
   AuthAPI.login(loginData.email, loginData.password)
  } 
*/
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // AuthAPI를 사용하여 스프링 백엔드에 로그인 요청
      const response = await AuthAPI.login(loginData.email, loginData.password)
      
      if (response.success && response.token) {
        // 토큰을 localStorage에 저장
        localStorage.setItem("auth_token", response.token)
        if (response.user) {
          localStorage.setItem("user_data", JSON.stringify(response.user))
        }
        
        // 기존 useAuth의 login 함수도 호출하여 상태 업데이트
        const success = await login(loginData.email, loginData.password)
        if (success) {
          router.push("/admin")
        }
      } else {
        setError(response.message || "이메일 또는 비밀번호가 올바르지 않습니다.")
      }
    } catch (error) {
      console.error("로그인 실패:", error)
      setError("로그인 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (registerData.password !== registerData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    if (registerData.password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.")
      return
    }

    setLoading(true)

    try {
      // AuthAPI를 사용하여 스프링 백엔드에 회원가입 요청
      const response = await AuthAPI.register(registerData.email, registerData.password, registerData.name)
      
      if (response.success && response.token) {
        // 토큰을 localStorage에 저장
        localStorage.setItem("auth_token", response.token)
        if (response.user) {
          localStorage.setItem("user_data", JSON.stringify(response.user))
        }
        
        // 기존 useAuth의 register 함수도 호출하여 상태 업데이트
        const success = await register(registerData.email, registerData.password, registerData.name)
        if (success) {
          router.push("/admin")
        }
      } else {
        setError(response.message || "회원가입에 실패했습니다. 이미 존재하는 이메일일 수 있습니다.")
      }
    } catch (error) {
      console.error("회원가입 실패:", error)
      setError("회원가입 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 hover:scale-105 transition-transform duration-200 cursor-pointer">
              <Bike className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            VeloNext
          </h1>
          <p className="text-gray-600 mt-2">관리 시스템 및 커뮤니티에 오신 것을 환영합니다</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Auth Card */}
          <Card className="glass-effect border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-xl">로그인 / 회원가입</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 glass-effect border-0">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                  >
                    로그인
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                  >
                    회원가입
                  </TabsTrigger>
                </TabsList>

                {error && (
                  <Alert className="mt-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="login" className="space-y-4 mt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="이메일을 입력하세요"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="pl-10 glass-effect border-0 bg-white/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="비밀번호를 입력하세요"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className="pl-10 glass-effect border-0 bg-white/50"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          로그인 중...
                        </>
                      ) : (
                        "로그인"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4 mt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">이름</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="이름을 입력하세요"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                          className="pl-10 glass-effect border-0 bg-white/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="이메일을 입력하세요"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className="pl-10 glass-effect border-0 bg-white/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="비밀번호를 입력하세요 (6자 이상)"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className="pl-10 glass-effect border-0 bg-white/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">비밀번호 확인</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="register-confirm-password"
                          type="password"
                          placeholder="비밀번호를 다시 입력하세요"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          className="pl-10 glass-effect border-0 bg-white/50"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          회원가입 중...
                        </>
                      ) : (
                        "회원가입"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>© 2024 VeloNext. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
