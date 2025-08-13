"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useAuth } from "@/contexts/auth-context"
import PostsAPI from "@/api/postsAPI"

import { PostList } from "@/components/post-list"
import { PostDetail } from "@/components/post-detail"
import { CreatePostModal } from "@/components/create-post-modal"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Badge } from "@/components/ui/badge"

import {
  Plus,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  Crown,
  UserIcon,
  LogOut,
} from "lucide-react"

// 🔧 댓글 개수 불러올 때 사용할 백엔드 BASE URL
const SPRING_BASE =
  (process.env.NEXT_PUBLIC_SPRING_API_URL || "http://localhost:8080").replace(/\/$/, "")

type PostItem = {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  category: string
  isNotice?: boolean
  likes: number
  createdAt: string
  updatedAt?: string
  commentCount: number
  liked?: boolean
  comments?: any[]
}

export default function CommunityPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  // ✅ 전체 글(전 카테고리)을 보관 → 통계/탭 숫자/핀고정 계산용
  const [allPosts, setAllPosts] = useState<PostItem[]>([])

  // ✅ 화면에 실제로 보여줄 목록 (selectedCategory 기반 필터링 + 공지 포함/핀 고정)
  const [posts, setPosts] = useState<PostItem[]>([])

  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const isAdmin = user?.role === "admin"

  // -----------------------------
  // 1) 최초/로그인완료 시 전체글 로드
  // -----------------------------
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }
    if (user) {
      // 전체 글 한 번에 로드 → allPosts 세팅
      fetchAllPosts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router])

  // -----------------------------
  // 2) allPosts / selectedCategory 바뀌면
  //    화면에 보여줄 posts를 프론트에서 계산
  //    - 공지(notice)는 모든 카테고리에 항상 포함
  //    - 공지는 상단 고정, 나머지는 최신순
  // -----------------------------
  useEffect(() => {
    const visible =
      selectedCategory === "all"
        ? allPosts
        : allPosts.filter(
            (p) => p.category === selectedCategory || p.category === "notice"
          )

    const sorted = [...visible].sort((a, b) => {
      const pinA = a.category === "notice" ? 1 : 0
      const pinB = b.category === "notice" ? 1 : 0
      if (pinA !== pinB) return pinB - pinA // 공지 먼저
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    setPosts(sorted)
  }, [allPosts, selectedCategory])

  // -----------------------------
  // 서버에서 전체 글 로드(+댓글 수 채우기)
  // -----------------------------
  const fetchAllPosts = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("auth_token")
      if (!token) {
        setError("로그인이 필요합니다.")
        return
      }

      // 전체 글
      const data = await PostsAPI.getPosts({})
      const postsArray: any[] = Array.isArray(data) ? data : data.content || []

      const formatted: PostItem[] = postsArray.map((post: any) => ({
        id: String(post.id),
        title: post.title,
        content: post.content,
        author: post.author ?? post.authorName ?? "",
        authorId: String(post.authorId ?? ""),
        category: post.category ?? "free",
        isNotice: Boolean(post.isNotice ?? post.notice),
        likes: Number(post.likes ?? 0),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt || post.createdAt,
        commentCount: Number(post.commentCount ?? (post.comments?.length ?? 0)),
        liked: false,
        comments: post.comments || [],
      }))

      // 댓글 수 최신화(선택) — 과도하면 제거 가능
      const withCounts = await Promise.all(
        formatted.map(async (p) => {
          try {
            const res = await fetch(`${SPRING_BASE}/api/posts/${p.id}/comments`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            })
            if (res.ok) {
              const arr = await res.json()
              return { ...p, commentCount: Array.isArray(arr) ? arr.length : p.commentCount }
            }
            return p
          } catch {
            return p
          }
        })
      )

      setAllPosts(withCounts)
    } catch (err) {
      console.error("🚨 [Community] 전체 글 로드 오류:", err)
      setError("서버 연결에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------
  // 글/댓글 조작 핸들러들
  // 조작 후엔 fetchAllPosts()로 전체 새로고침
  // -----------------------------
  const handleCreatePost = async (postData: { title: string; content: string; category?: string }) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token || !user) {
        alert("로그인이 필요합니다.")
        return false
      }
      if (postData.category === "notice" && !isAdmin) {
        alert("공지사항은 관리자만 작성할 수 있습니다.")
        return false
      }

      // 최종 카테고리 결정
      let finalCategory = postData.category || "free"
      if (postData.category !== "notice" && selectedCategory !== "all") {
        finalCategory = selectedCategory
      }

      await PostsAPI.createPost(
        { title: postData.title, content: postData.content, category: finalCategory },
        token
      )

      await fetchAllPosts()
      return true
    } catch (err) {
      console.error("🚨 [Community] 게시글 작성 오류:", err)
      alert("게시글 작성에 실패했습니다.")
      return false
    }
  }

  const handleEditPost = async (
    postId: string,
    postData: { title: string; content: string; category?: string }
  ) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("로그인이 필요합니다.")
        return false
      }

      const updated = await PostsAPI.updatePost(
        postId,
        {
          title: postData.title,
          content: postData.content,
          category: postData.category || "free",
        },
        token
      )

      // 로컬 상태 즉시 반영
      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                title: updated.title ?? postData.title,
                content: updated.content ?? postData.content,
                category: updated.category ?? postData.category ?? p.category,
                updatedAt: updated.updatedAt ?? new Date().toISOString(),
              }
            : p
        )
      )
      if (selectedPost?.id === postId) {
        setSelectedPost((sp) =>
          sp
            ? {
                ...sp,
                title: updated.title ?? postData.title,
                content: updated.content ?? postData.content,
                category: updated.category ?? postData.category ?? sp.category,
                updatedAt: updated.updatedAt ?? new Date().toISOString(),
              }
            : sp
        )
      }

      // 서버 상태 기준으로 재동기화
      await fetchAllPosts()
      return true
    } catch (err) {
      console.error("🚨 [Community] 게시글 수정 오류:", err)
      alert("게시글 수정에 실패했습니다.")
      return false
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) return false
    try {
      if (!user) {
        alert("로그인이 필요합니다.")
        return false
      }
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("인증 토큰이 없습니다. 다시 로그인해주세요.")
        return false
      }

      await PostsAPI.deletePost(postId, token)

      // 로컬 즉시 반영
      setAllPosts((prev) => prev.filter((p) => p.id !== postId))
      if (selectedPost?.id === postId) setSelectedPost(null)

      // 서버 상태 재동기화
      await fetchAllPosts()
      return true
    } catch (err: any) {
      console.error("🚨 [Community] 게시글 삭제 오류:", err)
      if (err instanceof Error) {
        if (err.message.includes("403")) alert("권한이 없습니다. 본인이 작성한 게시글만 삭제할 수 있습니다.")
        else if (err.message.includes("401")) alert("인증이 만료되었습니다. 다시 로그인해주세요.")
        else alert(`게시글 삭제에 실패했습니다: ${err.message}`)
      } else {
        alert("게시글 삭제에 실패했습니다.")
      }
      return false
    }
  }

  const handleLikePost = async (postId: string) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("로그인이 필요합니다.")
        return
      }

      await PostsAPI.likePost(postId, token)

      // 로컬 반영
      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes: p.likes + 1, liked: !p.liked } : p
        )
      )
      if (selectedPost?.id === postId) {
        setSelectedPost((sp) => (sp ? { ...sp, likes: sp.likes + 1, liked: !sp.liked } : sp))
      }
    } catch (err) {
      console.error("🚨 [Community] 좋아요 처리 오류:", err)
      alert("좋아요 처리에 실패했습니다.")
    }
  }

  const handleAddComment = async (postId: string, content: string) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token || !user) {
        alert("로그인이 필요합니다.")
        return false
      }

      const res = await fetch(`${SPRING_BASE}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (res.ok) {
        // 리스트/상세 모두 정확히 맞추려면 전체 재로드
        await fetchAllPosts()

        // 선택된 글 댓글 목록 최신화
        try {
          const cr = await fetch(`${SPRING_BASE}/api/posts/${postId}/comments`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })
          if (cr.ok) {
            const commentsData = await cr.json()
            if (selectedPost?.id === postId) {
              setSelectedPost((sp) => (sp ? { ...sp, comments: commentsData, commentCount: commentsData.length } : sp))
            }
          }
        } catch {}

        return true
      } else {
        let msg = ""
        try {
          const j = await res.json()
          msg = j?.error || ""
        } catch {}
        if (res.status === 403) alert("댓글 작성 권한이 없습니다. 로그인 상태를 확인해주세요.")
        else if (res.status === 401) alert("인증에 실패했습니다. 다시 로그인해주세요.")
        else alert(msg || "댓글 작성에 실패했습니다.")
        return false
      }
    } catch (err) {
      console.error("🚨 [Community] 댓글 작성 오류:", err)
      alert("서버 연결에 실패했습니다.")
      return false
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) return false
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("로그인이 필요합니다.")
        return false
      }

      const res = await fetch(`${SPRING_BASE}/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        await fetchAllPosts()

        // 선택된 글 댓글 목록 최신화
        try {
          const cr = await fetch(`${SPRING_BASE}/api/posts/${postId}/comments`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })
          if (cr.ok) {
            const commentsData = await cr.json()
            if (selectedPost?.id === postId) {
              setSelectedPost((sp) => (sp ? { ...sp, comments: commentsData, commentCount: commentsData.length } : sp))
            }
          }
        } catch {}

        return true
      } else {
        alert("댓글 삭제에 실패했습니다.")
        return false
      }
    } catch (err) {
      console.error("🚨 [Community] 댓글 삭제 오류:", err)
      alert("서버 연결에 실패했습니다.")
      return false
    }
  }

  const handleEditComment = async (postId: string, commentId: string, newContent: string) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("로그인이 필요합니다.")
        return false
      }

      const res = await fetch(`${SPRING_BASE}/api/posts/${postId}/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newContent.trim() }),
      })

      if (res.ok) {
        // 부분 업데이트도 가능하지만 일관성 위해 재로드
        await fetchAllPosts()

        // 상세 댓글만 즉시 최신화
        const cr = await fetch(`${SPRING_BASE}/api/posts/${postId}/comments`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        if (cr.ok) {
          const commentsData = await cr.json()
          if (selectedPost?.id === postId) {
            setSelectedPost((sp) => (sp ? { ...sp, comments: commentsData } : sp))
          }
        }
        return true
      } else {
        alert("댓글 수정에 실패했습니다.")
        return false
      }
    } catch (err) {
      console.error("🚨 [Community] 댓글 수정 오류:", err)
      alert("서버 연결에 실패했습니다.")
      return false
    }
  }

  // 게시글 선택 시 댓글 불러오기 + URL 쿼리 업데이트
  const handleSelectPost = async (post: PostItem) => {
    setSelectedPost(post)

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) return

      const cr = await fetch(`${SPRING_BASE}/api/posts/${post.id}/comments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      if (cr.ok) {
        const commentsData = await cr.json()
        setSelectedPost({ ...post, comments: commentsData, commentCount: commentsData.length })
      } else {
        setSelectedPost({ ...post, comments: [], commentCount: 0 })
      }
    } catch {
      setSelectedPost({ ...post, comments: [], commentCount: 0 })
    }

    const url = new URL(window.location.href)
    url.searchParams.set("postId", String(post.id))
    window.history.replaceState({}, "", url.toString())
  }

  // ---------------- UI ----------------
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-4">커뮤니티를 이용하려면 로그인해주세요.</p>
            <Link href="/auth">
              <Button>로그인하기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  관리자 페이지
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">VeloNext 커뮤니티</h1>
                  <div className="text-purple-100 flex items-center gap-2">
                    환영합니다, {user?.name}님 (ID: {user?.id})
                    {isAdmin && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs">
                        <Crown className="w-3 h-3 mr-1" />
                        관리자
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/mypage">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <UserIcon className="w-4 h-4 mr-2" />
                  마이페이지
                </Button>
              </Link>

              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                글쓰기
                {isAdmin && <span className="ml-1 text-yellow-300">👑</span>}
              </Button>

              <Button
                onClick={logout}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 통계 카드 (✅ allPosts 기준) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">전체 게시글</p>
                  <p className="text-2xl font-bold text-purple-600">{allPosts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">공지사항</p>
                  <p className="text-2xl font-bold text-red-600">
                    {allPosts.filter((post) => post.category === "notice").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">총 좋아요</p>
                  <p className="text-2xl font-bold text-green-600">
                    {allPosts.reduce((sum, post) => sum + (post.likes || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 카테고리 탭 (✅ 숫자도 allPosts 기준) */}
        <Card className="glass-effect border-0 shadow-xl mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              {[
                { key: "all", label: "전체", icon: "📋", color: "from-gray-500 to-gray-600" },
                { key: "notice", label: "공지사항", icon: "📢", color: "from-red-500 to-red-600", adminOnly: true },
                { key: "report", label: "신고/문의", icon: "🚨", color: "from-orange-500 to-orange-600" },
                { key: "suggestion", label: "개선제안", icon: "💡", color: "from-yellow-500 to-yellow-600" },
                { key: "review", label: "이용후기", icon: "⭐", color: "from-green-500 to-green-600" },
                { key: "free", label: "자유게시판", icon: "💬", color: "from-blue-500 to-blue-600" },
              ].map((category) => (
                <Button
                  key={category.key}
                  variant={selectedCategory === category.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.key)}
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    selectedCategory === category.key
                      ? `bg-gradient-to-r ${category.color} text-white shadow-lg hover:shadow-xl`
                      : "glass-effect border-0 bg-white/50 hover:bg-white/70"
                  }`}
                >
                  <span>{category.icon}</span>
                  {category.label}
                  {category.adminOnly && <Crown className="w-3 h-3 text-yellow-400" />}
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      selectedCategory === category.key ? "bg-white/20" : "bg-gray-100"
                    }`}
                  >
                    {category.key === "all"
                      ? allPosts.length
                      : allPosts.filter((post) => post.category === category.key).length}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 메인 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 게시글 목록 */}
          <div className="lg:col-span-1">
            <Card className="glass-effect border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-white/20">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  게시글 목록
                  {selectedCategory === "notice" && (
                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white">📢 공지사항</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-center">
                    <LoadingSpinner />
                  </div>
                ) : error ? (
                  <div className="p-6 text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={() => fetchAllPosts()} variant="outline">
                      다시 시도
                    </Button>
                  </div>
                ) : (
                  <PostList
                    posts={posts}
                    selectedPost={selectedPost}
                    onSelectPost={(post: any | null) => {
                      if (post) handleSelectPost(post)
                    }}
                    onLikePost={handleLikePost}
                    onEditPost={handleEditPost}
                    onDeletePost={handleDeletePost}
                    currentUser={user as any}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* 게시글 상세 */}
          <div className="lg:col-span-2">
            <Card className="glass-effect border-0 shadow-xl h-full">
              <CardContent className="p-0 h-full">
                {selectedPost ? (
                  <PostDetail
                    post={selectedPost}
                    onLikePost={handleLikePost}
                    onEditPost={handleEditPost}
                    onDeletePost={handleDeletePost}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    onEditComment={handleEditComment}
                    currentUser={user as any}
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500 h-full flex items-center justify-center">
                    <div>
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">게시글을 선택해주세요</h3>
                      <p className="text-gray-500">왼쪽 목록에서 읽고 싶은 게시글을 클릭하세요</p>
                      {isAdmin && (
                        <p className="text-yellow-600 text-sm mt-2 flex items-center justify-center gap-1">
                          <Crown className="w-4 h-4" />
                          관리자 권한으로 공지사항을 작성할 수 있습니다
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 글쓰기 모달 */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        currentUser={user}
      />
    </div>
  )
}
