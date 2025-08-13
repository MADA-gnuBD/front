"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useWorkHistory } from "@/contexts/work-history-context"
import AuthAPI from "@/api/authAPI"
import PostsAPI from "@/api/postsAPI"
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Trash2,
  MessageSquare,
  Clock,
  MapPin,
  Wrench,
} from "lucide-react"
import Link from "next/link"

export default function MyPage() {
  const { user, loading, updateProfile, deleteAccount, logout } = useAuth()
  const { workHistory, loading: workHistoryLoading } = useWorkHistory()
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [updating, setUpdating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [postsLoading, setPostsLoading] = useState(false)

  // 인증 체크
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth")
    } else if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      fetchUserPosts()
    }
  }, [user, loading, router])

  // 사용자 게시글
  const fetchUserPosts = async () => {
    if (!user) return
    setPostsLoading(true)
    try {
      const data = await PostsAPI.getPosts({})
      const postsArray = Array.isArray(data) ? data : (data.content || [])
      const mine = postsArray.filter(
        (p: any) => p.author === user.email || p.authorId === user.id || p.authorName === user.name
      )
      const formatted = mine.map((post: any) => ({
        ...post,
        createdAt: new Date(post.createdAt),
        comments: post.comments?.length || 0,
      }))
      setUserPosts(formatted)
    } catch (e) {
      console.error("Failed to fetch user posts:", e)
    } finally {
      setPostsLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // 비밀번호 변경 검증
    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setError("새 비밀번호는 6자 이상이어야 합니다.")
        return
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError("새 비밀번호가 일치하지 않습니다.")
        return
      }
      if (!formData.currentPassword) {
        setError("현재 비밀번호를 입력해주세요.")
        return
      }
    }

    setUpdating(true)
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        setError("로그인이 필요합니다.")
        return
      }

      const payload: any = {
        name: formData.name,
        email: formData.email,
      }
      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword
        payload.newPassword = formData.newPassword
      }

      // ✅ 성공 시 예외 없이 반환되므로 success 플래그 의존 X
      const updated: any = await AuthAPI.updateProfile(payload, token)

      // 서버가 갱신된 사용자 정보를 돌려주면 반영
      const mergedUser = {
        id: updated?.id ?? user?.id,
        email: updated?.email ?? payload.email,
        name: updated?.name ?? payload.name,
        role: updated?.role ?? user?.role,
      }
      localStorage.setItem("user_data", JSON.stringify(mergedUser))
      await updateProfile(mergedUser)

      setSuccess("프로필이 성공적으로 업데이트되었습니다.")
      setFormData((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }))
    } catch (err: any) {
      console.error("프로필 업데이트 실패:", err)
      setError(err?.message || "프로필 업데이트에 실패했습니다.")
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "회원탈퇴") {
      setError("'회원탈퇴'를 정확히 입력해주세요.")
      return
    }

    setDeleting(true)
    setError("")
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        setError("로그인이 필요합니다.")
        return
      }
      await AuthAPI.deleteAccount(token)
      alert("회원탈퇴가 완료되었습니다.")
      await deleteAccount()
      logout()
      router.push("/")
    } catch (err: any) {
      console.error("회원탈퇴 실패:", err)
      setError(err?.message || "회원탈퇴에 실패했습니다.")
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const categories = {
      notice: "공지사항",
      report: "신고/문의",
      suggestion: "개선제안",
      review: "이용후기",
      free: "자유게시판",
    }
    return categories[category as keyof typeof categories] || category
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })

  const formatDateTime = (date: Date) =>
    date.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  const handlePostClick = (postId: string) => router.push(`/community?postId=${postId}`)

  const userWorkHistory = user ? workHistory.filter((item) => item.userId === user.email) : []
  const emergencyWorkHistory = userWorkHistory.filter((item) => item.action.includes("긴급"))
  const normalWorkHistory = userWorkHistory.filter((item) => !item.action.includes("긴급"))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800">로딩 중...</h2>
        </div>
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="sm" className="glass-effect border-0 bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  관리자 페이지
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">마이페이지</h1>
                  <p className="text-sm text-gray-600">개인정보 및 활동 내역</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 요약 */}
          <Card className="glass-effect border-0 shadow-xl mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{user.name}</h2>
                  <p className="text-gray-600 mb-3">{user.email}</p>
                  <div className="flex gap-3">
                    <Badge className={user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                      {user.role === "admin" ? "관리자" : "일반 사용자"}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{userPosts.length}</p>
                    <p className="text-sm text-gray-600">작성한 글</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {userPosts.reduce((sum, post) => sum + post.likes, 0)}
                    </p>
                    <p className="text-sm text-gray-600">받은 좋아요</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{userWorkHistory.length}</p>
                    <p className="text-sm text-gray-600">완료한 작업</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 탭 */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 glass-effect border-0 p-1">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                <User className="w-4 h-4 mr-2" />
                프로필 설정
              </TabsTrigger>
              <TabsTrigger
                value="posts"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                내가 쓴 글
              </TabsTrigger>
              <TabsTrigger
                value="work-history"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
              >
                <Wrench className="w-4 h-4 mr-2" />
                작업내역
              </TabsTrigger>
              <TabsTrigger
                value="danger"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                계정관리
              </TabsTrigger>
            </TabsList>

            {/* 프로필 설정 */}
            <TabsContent value="profile">
              <Card className="glass-effect border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    프로필 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {error && (
                    <Alert className="mb-6 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="mb-6 border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* 기본 정보 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">기본 정보</h3>

                      <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="pl-10 glass-effect border-0 bg-white/50"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">이메일</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="pl-10 glass-effect border-0 bg-white/50"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 비밀번호 변경 */}
                    <div className="space-y-4 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">비밀번호 변경</h3>
                      <p className="text-sm text-gray-600">비밀번호를 변경하지 않으려면 아래 필드를 비워두세요.</p>

                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">현재 비밀번호</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="currentPassword"
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="pl-10 glass-effect border-0 bg-white/50"
                            placeholder="비밀번호 변경 시에만 입력"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">새 비밀번호</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="newPassword"
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="pl-10 glass-effect border-0 bg-white/50"
                            placeholder="새 비밀번호 (6자 이상)"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="pl-10 glass-effect border-0 bg-white/50"
                            placeholder="새 비밀번호 다시 입력"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={updating}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          업데이트 중...
                        </>
                      ) : (
                        "프로필 업데이트"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 내가 쓴 글 */}
            <TabsContent value="posts">
              <Card className="glass-effect border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-b border-white/20">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    내가 작성한 글 ({userPosts.length}개)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {postsLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-semibold text-gray-600">게시글을 불러오는 중...</h3>
                    </div>
                  ) : userPosts.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">작성한 글이 없습니다</h3>
                      <p className="text-gray-500 mb-4">커뮤니티에서 첫 번째 글을 작성해보세요!</p>
                      <Link href="/community">
                        <Button className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                          글 작성하러 가기
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userPosts.map((post) => (
                        <div
                          key={post.id}
                          className="bg-white/50 rounded-lg p-4 border border-gray-100 cursor-pointer hover:bg-white/70 transition-all duration-200"
                          onClick={() => handlePostClick(post.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-green-100 text-green-800">{getCategoryLabel(post.category)}</Badge>
                                <span className="text-sm text-gray-500">{formatDate(post.createdAt)}</span>
                              </div>
                              <h4 className="font-semibold text-gray-800 mb-1">{post.title}</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>👍 {post.likes}</span>
                            <span>💬 {post.comments}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 작업내역 */}
            <TabsContent value="work-history">
              <Card className="glass-effect border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-b border-white/20">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    작업 내역
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 glass-effect border-0 p-1">
                      <TabsTrigger
                        value="all"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                      >
                        전체 ({userWorkHistory.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="emergency"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
                      >
                        긴급 ({emergencyWorkHistory.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="normal"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                      >
                        일반 ({normalWorkHistory.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                      {workHistoryLoading ? (
                        <div className="text-center py-12">
                          <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                          <h3 className="text-lg font-semibold text-gray-600">작업 내역을 불러오는 중...</h3>
                        </div>
                      ) : userWorkHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">완료한 작업이 없습니다</h3>
                          <p className="text-gray-500">
                            {user.role === "admin"
                              ? "관리자 대시보드에서 작업을 시작해보세요!"
                              : "관리 업무에 참여하여 작업을 완료해보세요!"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {userWorkHistory.map((work) => (
                            <div key={work.id} className="bg-white/50 rounded-lg p-4 border border-gray-100">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-purple-100 text-purple-800">{work.action}</Badge>
                                    <span className="text-sm text-gray-500">
                                      <Clock className="w-4 h-4 inline mr-1" />
                                      {formatDateTime(work.completedAt)}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    {work.stationName}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">대여소 ID: {work.stationId}</p>
                                  {work.notes && <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">📝 {work.notes}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="emergency" className="mt-4">
                      {workHistoryLoading ? (
                        <div className="text-center py-12">
                          <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                          <h3 className="text-lg font-semibold text-gray-600">작업 내역을 불러오는 중...</h3>
                        </div>
                      ) : emergencyWorkHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">완료한 긴급 작업이 없습니다</h3>
                          <p className="text-gray-500">
                            {user.role === "admin"
                              ? "관리자 대시보드에서 긴급 작업을 시작해보세요!"
                              : "관리 업무에 참여하여 긴급 작업을 완료해보세요!"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {emergencyWorkHistory.map((work) => (
                            <div key={work.id} className="bg-white/50 rounded-lg p-4 border border-gray-100">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-red-100 text-red-800">{work.action}</Badge>
                                    <span className="text-sm text-gray-500">
                                      <Clock className="w-4 h-4 inline mr-1" />
                                      {formatDateTime(work.completedAt)}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    {work.stationName}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">대여소 ID: {work.stationId}</p>
                                  {work.notes && <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">📝 {work.notes}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="normal" className="mt-4">
                      {workHistoryLoading ? (
                        <div className="text-center py-12">
                          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600">작업 내역을 불러오는 중...</h3>
                        </div>
                      ) : normalWorkHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">완료한 일반 작업이 없습니다</h3>
                          <p className="text-gray-500">
                            {user.role === "admin"
                              ? "관리자 대시보드에서 일반 작업을 시작해보세요!"
                              : "관리 업무에 참여하여 일반 작업을 완료해보세요!"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {normalWorkHistory.map((work) => (
                            <div key={work.id} className="bg-white/50 rounded-lg p-4 border border-gray-100">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-blue-100 text-blue-800">{work.action}</Badge>
                                    <span className="text-sm text-gray-500">
                                      <Clock className="w-4 h-4 inline mr-1" />
                                      {formatDateTime(work.completedAt)}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    {work.stationName}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">대여소 ID: {work.stationId}</p>
                                  {work.notes && <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">📝 {work.notes}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 계정 관리 */}
            <TabsContent value="danger">
              <Card className="glass-effect border-0 shadow-xl border-red-200">
                <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-b border-red-200">
                  <CardTitle className="flex items-center gap-3 text-red-700">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-white" />
                    </div>
                    위험 구역
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-red-700 mb-2">회원탈퇴</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        회원탈퇴 시 모든 데이터가 삭제되며, 복구할 수 없습니다. 신중하게 결정해주세요.
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      variant="destructive"
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      회원탈퇴
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 회원탈퇴 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="glass-effect border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              회원탈퇴 확인
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ 주의사항</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• 모든 개인정보가 영구적으로 삭제됩니다</li>
                <li>• 작성한 게시글과 댓글이 모두 삭제됩니다</li>
                <li>• 탈퇴 후 동일한 이메일로 재가입할 수 없습니다</li>
                <li>• 이 작업은 되돌릴 수 없습니다</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">
                정말로 탈퇴하시려면 <strong>'회원탈퇴'</strong>를 입력해주세요:
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="glass-effect border-0 bg-white/50"
                placeholder="회원탈퇴"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmText("")
                setError("")
              }}
              className="glass-effect border-0 bg-transparent"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== "회원탈퇴"}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  탈퇴 처리 중...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  회원탈퇴
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
