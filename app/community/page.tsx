"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import PostsAPI from "@/api/postsAPI"
import { PostList } from "@/components/post-list"
import { PostDetail } from "@/components/post-detail"
import { CreatePostModal } from "@/components/create-post-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Plus, MessageSquare, TrendingUp, ArrowLeft, Crown, UserIcon, LogOut } from "lucide-react"
import Link from "next/link"



export default function CommunityPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const isAdmin = user?.role === "admin"

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }
    if (user) {
      console.log("👤 [Community] 현재 사용자:", {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === "admin",
      })
      fetchPosts(selectedCategory)
    }
  }, [user, authLoading, router, selectedCategory])

  const fetchPosts = async (category = "all") => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("auth_token")
      if (!token) {
        setError("로그인이 필요합니다.")
        return
      }

      console.log("📡 [Community] 게시글 목록 요청 중... 카테고리:", category)

      // PostsAPI를 사용하여 스프링 백엔드에서 게시글 목록 가져오기
      const params: any = {}
      if (category !== "all") {
        params.category = category
      }

      const data = await PostsAPI.getPosts(params)
      
      // 🔥 데이터 구조 확인 및 수정
      const postsArray = Array.isArray(data) ? data : (data.content || [])
      console.log("✅ [Community] 게시글 목록 로드 성공:", postsArray.length, "개")
      console.log("📊 [Community] 받은 데이터:", data)
      console.log("📊 [Community] data.content:", data.content)
      console.log("📊 [Community] data.content 길이:", data.content?.length)
      console.log("📊 [Community] 첫 번째 게시글:", data.content?.[0])
      console.log("🔍 [Community] 카테고리 필터:", category)
      console.log("🔍 [Community] 요청 파라미터:", params)
      console.log("📊 [Community] postsArray:", postsArray)
      console.log("📊 [Community] postsArray 길이:", postsArray.length)

      // 데이터 형식 변환 - Spring Boot 응답을 프론트엔드 형식에 맞게 변환
      const formattedPosts = postsArray.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        authorId: post.authorId,
        category: post.category,
        isNotice: post.isNotice || false,
        likes: post.likes || 0,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt || post.createdAt,
        commentCount: post.commentCount || post.comments?.length || 0, // Spring 백엔드에서 commentCount 필드가 있으면 사용, 없으면 comments 배열 길이 사용
        liked: false, // 임시로 false 설정 (나중에 사용자별 좋아요 상태 구현)
        comments: post.comments || [],
      }))

      console.log("🔄 [Community] 변환된 게시글:", formattedPosts)
      console.log("🔄 [Community] 변환된 게시글 길이:", formattedPosts.length)

      // 🔥 각 게시글의 댓글 개수를 별도로 가져오기
      const postsWithCommentCount = await Promise.all(
        formattedPosts.map(async (post: any) => {
          try {
            const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
            const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
            
            const commentsResponse = await fetch(`${baseUrl}/api/posts/${post.id}/comments`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
            })

            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json()
              console.log(`📄 [Community] 게시글 ${post.id} 댓글 개수:`, commentsData.length)
              return {
                ...post,
                commentCount: commentsData.length,
              }
            } else {
              console.error(`❌ [Community] 게시글 ${post.id} 댓글 개수 가져오기 실패:`, commentsResponse.status)
              return post
            }
          } catch (error) {
            console.error(`🚨 [Community] 게시글 ${post.id} 댓글 개수 가져오기 오류:`, error)
            return post
          }
        })
      )

      console.log("🔄 [Community] 댓글 개수 포함된 게시글:", postsWithCommentCount)
      setPosts(postsWithCommentCount)
    } catch (err) {
      console.error("🚨 [Community] 게시글 목록 로드 오류:", err)
      setError("서버 연결에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (postData: { title: string; content: string; category?: string }) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token || !user) {
        alert("로그인이 필요합니다.")
        return false
      }

      // 관리자가 아닌데 공지사항 작성하려는 경우 체크
      if (postData.category === "notice" && !isAdmin) {
        alert("공지사항은 관리자만 작성할 수 있습니다.")
        return false
      }

      console.log("📝 [Community] 게시글 작성 요청:", postData)

      // 🔥 카테고리 설정 로직 개선
      let finalCategory = postData.category || "free"
      let isNotice = false

      // 공지사항인 경우
      if (postData.category === "notice") {
        finalCategory = "notice"
        isNotice = true
      }
      // 선택된 카테고리가 있고 "all"이 아닌 경우
      else if (selectedCategory !== "all") {
        finalCategory = selectedCategory
      }

      console.log("🔍 [Community] 최종 카테고리 설정:", {
        originalCategory: postData.category,
        selectedCategory,
        finalCategory,
        isNotice,
      })

      const requestData = {
        title: postData.title,
        content: postData.content,
        category: finalCategory,
      }

      console.log("📤 [Community] 서버로 전송할 데이터:", requestData)

      // PostsAPI를 사용하여 스프링 백엔드에 게시글 작성 요청
      await PostsAPI.createPost(requestData, token)
      console.log("✅ [Community] 게시글 작성 성공")
      
      // 🔥 현재 선택된 카테고리로 목록 새로고침
      await fetchPosts(selectedCategory)
      console.log("🔄 [Community] 게시글 목록 새로고침 완료 - 카테고리:", selectedCategory)
      return true
    } catch (err) {
      console.error("🚨 [Community] 게시글 작성 오류:", err)
      alert("게시글 작성에 실패했습니다.")
      return false
    }
  }

  const handleEditPost = async (postId: string, postData: { title: string; content: string; category?: string }) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("로그인이 필요합니다.")
        return false
      }

      console.log("✏️ [Community] 게시글 수정 요청:", postId, postData)
      
      // PostsAPI를 사용하여 스프링 백엔드에 게시글 수정 요청
      const updatedPost = await PostsAPI.updatePost(postId, {
        title: postData.title,
        content: postData.content,
        category: postData.category || "free" // 전달받은 카테고리 사용
      }, token)
      console.log("✅ [Community] 게시글 수정 성공:", updatedPost)

      // 🔥 목록에서 해당 게시글 업데이트 - 제목, 내용, 카테고리 포함
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                title: updatedPost.title || postData.title, // 제목 업데이트
                content: updatedPost.content || postData.content, // 내용 업데이트
                category: updatedPost.category || postData.category || post.category, // 카테고리 업데이트
                updatedAt: updatedPost.updatedAt || new Date().toISOString(),
              }
            : post,
        ),
      )

      // 🔥 선택된 게시글도 업데이트 - 제목, 내용, 카테고리 포함
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({
          ...selectedPost,
          title: updatedPost.title || postData.title, // 제목 업데이트
          content: updatedPost.content || postData.content, // 내용 업데이트
          category: updatedPost.category || postData.category || selectedPost.category, // 카테고리 업데이트
          updatedAt: updatedPost.updatedAt || new Date().toISOString(),
        })
      }

      return true
    } catch (err) {
      console.error("🚨 [Community] 게시글 수정 오류:", err)
      alert("게시글 수정에 실패했습니다.")
      return false
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
      return false
    }

    try {
      // 사용자 인증 상태 확인
      if (!user) {
        alert("로그인이 필요합니다.")
        return false
      }

      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("인증 토큰이 없습니다. 다시 로그인해주세요.")
        return false
      }

      console.log("🗑️ [Community] 게시글 삭제 요청:", {
        postId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + "...",
      })
      
      // PostsAPI를 사용하여 스프링 백엔드에 게시글 삭제 요청
      await PostsAPI.deletePost(postId, token)
      console.log("✅ [Community] 게시글 삭제 성공")

      // 목록에서 해당 게시글 제거
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))

      // 선택된 게시글이 삭제된 게시글이면 선택 해제
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(null)
      }

      return true
    } catch (err) {
      console.error("🚨 [Community] 게시글 삭제 오류:", err)
      
      // 더 자세한 에러 메시지 제공
      if (err instanceof Error) {
        if (err.message.includes("403")) {
          alert("권한이 없습니다. 본인이 작성한 게시글만 삭제할 수 있습니다.")
        } else if (err.message.includes("401")) {
          alert("인증이 만료되었습니다. 다시 로그인해주세요.")
        } else {
          alert(`게시글 삭제에 실패했습니다: ${err.message}`)
        }
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

      console.log("❤️ [Community] 게시글 좋아요 요청:", postId)
      
      // PostsAPI를 사용하여 스프링 백엔드에 좋아요 요청
      await PostsAPI.likePost(postId, token)
      console.log("✅ [Community] 좋아요 처리 성공")

      // 목록에서 해당 게시글의 좋아요 상태 업데이트
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: post.likes + 1,
                liked: !post.liked,
              }
            : post,
        ),
      )

      // 선택된 게시글도 업데이트
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({
          ...selectedPost,
          likes: selectedPost.likes + 1,
          liked: !selectedPost.liked,
        })
      }
    } catch (err) {
      console.error("🚨 [Community] 좋아요 처리 오류:", err)
      alert("좋아요 처리에 실패했습니다.")
    }
  }

  // 🔥 댓글 작성 함수 개선 - 더 자세한 디버깅
  const handleAddComment = async (postId: string, content: string) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token || !user) {
        alert("로그인이 필요합니다.")
        return false
      }

      console.log("💬 [Community] 댓글 작성 요청:", {
        postId,
        content,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + "...",
      })

      const commentData = {
        content: content.trim(),
        author: user.name,
        authorId: user.id,
      }

      console.log("📤 [Community] 댓글 데이터:", commentData)

      // Spring 백엔드로 직접 요청
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
      
      const response = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      })

      console.log("📡 [Community] 댓글 작성 응답:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (response.ok) {
        let newComment
        const responseText = await response.text()
        
        console.log("📄 [Community] 댓글 응답 텍스트:", responseText)

        if (responseText) {
          try {
            const responseData = JSON.parse(responseText)
            console.log("📄 [Community] 파싱된 댓글 데이터:", responseData)
            
            // Spring 백엔드 응답 구조에 맞춰 댓글 객체 생성
            newComment = {
              id: responseData.id || Date.now().toString(),
              content: responseData.content || content.trim(),
              author: responseData.author || user.name,
              authorId: responseData.authorId || user.id,
              likes: responseData.likes || 0,
              createdAt: responseData.createdAt || new Date().toISOString(),
            }
          } catch (parseError) {
            console.error("❌ [Community] JSON 파싱 실패:", parseError)
            // JSON 파싱 실패 시 기본 댓글 객체 생성
            newComment = {
              id: Date.now().toString(),
              content: content.trim(),
              author: user.name,
              authorId: user.id,
              likes: 0,
              createdAt: new Date().toISOString(),
            }
          }
        } else {
          console.log("📄 [Community] 빈 응답 - 기본 댓글 객체 생성")
          // 빈 응답 시 기본 댓글 객체 생성
          newComment = {
            id: Date.now().toString(),
            content: content.trim(),
            author: user.name,
            authorId: user.id,
            likes: 0,
            createdAt: new Date().toISOString(),
          }
        }

        console.log("✅ [Community] 최종 댓글 객체:", newComment)

        // 선택된 게시글의 댓글 목록 업데이트
        if (selectedPost && selectedPost.id === postId) {
          console.log("🔄 [Community] 선택된 게시글 댓글 업데이트")
          setSelectedPost({
            ...selectedPost,
            comments: [...selectedPost.comments, newComment],
            commentCount: selectedPost.commentCount + 1,
          })
        }

        // 게시글 목록의 댓글 수도 업데이트
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  commentCount: post.commentCount + 1,
                }
              : post,
          ),
        )

        // 🔥 게시글 목록 새로고침으로 댓글 수 정확히 업데이트
        setTimeout(() => {
          fetchPosts(selectedCategory)
        }, 500)

        // 🔥 댓글 작성 후 댓글 목록 새로고침
        if (selectedPost && selectedPost.id === postId) {
          try {
            console.log("🔄 [Community] 댓글 목록 새로고침 시작")
            const commentsResponse = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
            })

            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json()
              console.log("📄 [Community] 새로고침된 댓글 목록:", commentsData)
              
              setSelectedPost({
                ...selectedPost,
                comments: commentsData,
                commentCount: commentsData.length,
              })
            } else {
              console.error("❌ [Community] 댓글 목록 새로고침 실패:", commentsResponse.status)
            }
          } catch (refreshError) {
            console.error("🚨 [Community] 댓글 목록 새로고침 오류:", refreshError)
          }
        }

        return true
      } else {
        // 🔥 에러 응답 처리 개선
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }

        console.error("❌ [Community] 댓글 작성 실패:", errorData)

        // 🔥 403 에러 특별 처리
        if (response.status === 403) {
          alert("댓글 작성 권한이 없습니다. 로그인 상태를 확인해주세요.")
        } else if (response.status === 401) {
          alert("인증에 실패했습니다. 다시 로그인해주세요.")
        } else {
          alert(errorData.error || "댓글 작성에 실패했습니다.")
        }

        return false
      }
    } catch (err) {
      console.error("🚨 [Community] 댓글 작성 오류:", err)
      alert("서버 연결에 실패했습니다.")
      return false
    }
  }

  // 🔥 댓글 삭제 함수 추가
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
      return false
    }

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("로그인이 필요합니다.")
        return false
      }

      console.log("🗑️ [Community] 댓글 삭제 요청:", { postId, commentId })
      
      // Spring 백엔드로 직접 요청
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
      
      const response = await fetch(`${baseUrl}/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })

      if (response.ok) {
        console.log("✅ [Community] 댓글 삭제 성공")

        // 선택된 게시글의 댓글 목록에서 해당 댓글 제거
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({
            ...selectedPost,
            comments: selectedPost.comments.filter((comment: any) => comment.id !== commentId),
            commentCount: selectedPost.commentCount - 1,
          })
        }

        // 게시글 목록의 댓글 수도 업데이트
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  commentCount: post.commentCount - 1,
                }
              : post,
          ),
        )

        // 🔥 게시글 목록 새로고침으로 댓글 수 정확히 업데이트
        setTimeout(() => {
          fetchPosts(selectedCategory)
        }, 500)

        return true
      } else {
        console.error("❌ [Community] 댓글 삭제 실패:", response.status)
        alert("댓글 삭제에 실패했습니다.")
        return false
      }
    } catch (err) {
      console.error("🚨 [Community] 댓글 삭제 오류:", err)
      alert("서버 연결에 실패했습니다.")
      return false
    }
  }

  // 🔥 댓글 수정 함수 추가
  const handleEditComment = async (postId: string, commentId: string, newContent: string) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        alert("로그인이 필요합니다.")
        return false
      }

      console.log("✏️ [Community] 댓글 수정 요청:", { postId, commentId, newContent })
      
      // Spring 백엔드로 직접 요청
      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
      
      const response = await fetch(`${baseUrl}/api/posts/${postId}/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newContent.trim(),
        }),
      })

      if (response.ok) {
        const updatedComment = await response.json()
        console.log("✅ [Community] 댓글 수정 성공:", updatedComment)

        // 선택된 게시글의 댓글 목록에서 해당 댓글 업데이트
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({
            ...selectedPost,
            comments: selectedPost.comments.map((comment: any) =>
              comment.id === commentId ? updatedComment : comment
            ),
          })
        }

        return true
      } else {
        console.error("❌ [Community] 댓글 수정 실패:", response.status)
        alert("댓글 수정에 실패했습니다.")
        return false
      }
    } catch (err) {
      console.error("🚨 [Community] 댓글 수정 오류:", err)
      alert("서버 연결에 실패했습니다.")
      return false
    }
  }

  // handleSelectPost 함수를 추가해서 더 안전하게 처리하자
  const handleSelectPost = async (post: any) => {
    console.log("🔍 [Community] 게시글 선택:", post.id, post.title)
    setSelectedPost(post)

    // 🔥 게시글 선택 시 댓글 목록 가져오기
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        console.error("토큰이 없습니다.")
        return
      }

      const springApiUrl = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8080'
      const baseUrl = springApiUrl.endsWith('/') ? springApiUrl.slice(0, -1) : springApiUrl
      
      console.log("📡 [Community] 댓글 목록 요청:", post.id)
      
      const commentsResponse = await fetch(`${baseUrl}/api/posts/${post.id}/comments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })

      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json()
        console.log("📄 [Community] 댓글 목록:", commentsData)
        
        setSelectedPost({
          ...post,
          comments: commentsData,
          commentCount: commentsData.length,
        })
      } else {
        console.error("❌ [Community] 댓글 목록 가져오기 실패:", commentsResponse.status)
        // 댓글 목록 가져오기 실패 시에도 게시글은 표시
        setSelectedPost({
          ...post,
          comments: [],
          commentCount: 0,
        })
      }
    } catch (error) {
      console.error("🚨 [Community] 댓글 목록 가져오기 오류:", error)
      // 오류 시에도 게시글은 표시
      setSelectedPost({
        ...post,
        comments: [],
        commentCount: 0,
      })
    }

    // URL 쿼리 파라미터로 선택된 게시글 ID 추가 (선택사항)
    const url = new URL(window.location.href)
    url.searchParams.set("postId", post.id)
    window.history.replaceState({}, "", url.toString())
  }

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
      {/* 🔥 헤더 - 마이페이지와 로그아웃 버튼 추가 */}
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
                  <h1 className="text-2xl font-bold">따릉이 커뮤니티</h1>
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
              {/* 🔥 마이페이지 버튼 추가 */}
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

              {/* 🔥 로그아웃 버튼 추가 */}
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
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-effect border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">전체 게시글</p>
                  <p className="text-2xl font-bold text-purple-600">{posts.length}</p>
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
                    {posts.filter((post) => post.category === "notice").length}
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
                    {posts.reduce((sum, post) => sum + post.likes, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 카테고리 탭 */}
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
                      ? posts.length
                      : posts.filter((post) => post.category === category.key).length}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 메인 콘텐츠 */}
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
                    <Button onClick={() => fetchPosts(selectedCategory)} variant="outline">
                      다시 시도
                    </Button>
                  </div>
                ) : (
                  <PostList
                    posts={posts}
                    selectedPost={selectedPost}
                    onSelectPost={(post: any | null) => {
                      if (post) {
                        console.log("🔍 [Community] 게시글 선택:", post.id, post.title)
                        handleSelectPost(post);
                      }
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

      {/* 게시글 작성 모달 */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        currentUser={user}
      />
    </div>
  )
}
