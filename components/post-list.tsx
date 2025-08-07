"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Trash2, Edit, Save, X } from "lucide-react"

interface Post {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  createdAt: string
  updatedAt: string
  likes: number
  commentCount: number
  liked: boolean
  category: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface PostListProps {
  posts: Post[]
  selectedPost: Post | null
  onSelectPost: (post: Post | null) => void
  onLikePost: (postId: string) => void
  onEditPost: (postId: string, postData: { title: string; content: string; category?: string }) => Promise<boolean>
  onDeletePost: (postId: string) => Promise<boolean>
  currentUser: User
}

export function PostList({
  posts,
  selectedPost,
  onSelectPost,
  onLikePost,
  onEditPost,
  onDeletePost,
  currentUser,
}: PostListProps) {
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "방금 전"
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}일 전`
    } else {
      return date.toLocaleDateString("ko-KR")
    }
  }

  const getCategoryInfo = (category: string) => {
    const categories = {
      notice: { label: "공지사항", icon: "📢", color: "from-red-500 to-red-600" },
      report: { label: "신고/문의", icon: "🚨", color: "from-orange-500 to-orange-600" },
      suggestion: { label: "개선제안", icon: "💡", color: "from-yellow-500 to-yellow-600" },
      review: { label: "이용후기", icon: "⭐", color: "from-green-500 to-green-600" },
      free: { label: "자유게시판", icon: "💬", color: "from-blue-500 to-blue-600" },
    }
    return categories[category as keyof typeof categories] || categories.free
  }

  const handleEdit = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation()
    setEditingPostId(post.id)
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditCategory(post.category)
  }

  const handleSave = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation()
    if (!editTitle.trim() || !editContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.")
      return
    }

    setIsSubmitting(true)
    try {
      const success = await onEditPost(postId, {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
      })
      if (success) {
        setEditingPostId(null)
        setEditTitle("")
        setEditContent("")
        setEditCategory("")
      }
    } catch (error) {
      console.error("게시글 수정 오류:", error)
      alert("게시글 수정 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPostId(null)
    setEditTitle("")
    setEditContent("")
  }

  const handleDelete = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation()
    await onDeletePost(postId)
  }

  const handleLike = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation()
    onLikePost(postId)
  }

  // 🔥 권한 체크 로직 개선
  const canEdit = (post: Post) => {
    const isAdmin = currentUser.role === "admin"
    // ID 비교 (문자열로 통일)
    const isAuthorById = String(currentUser.id) === String(post.authorId)
    // 이메일 비교 (백업)
    const isAuthorByEmail = currentUser.email === post.author

    console.log("🔍 [PostList] 권한 체크:", {
      postId: post.id,
      postTitle: post.title,
      postAuthor: post.author,
      postAuthorId: post.authorId,
      currentUserId: currentUser.id,
      currentUserEmail: currentUser.email,
      currentUserRole: currentUser.role,
      isAdmin,
      isAuthorById,
      isAuthorByEmail,
      canEdit: isAdmin || isAuthorById || isAuthorByEmail,
    })

    return isAdmin || isAuthorById || isAuthorByEmail
  }

  // PostList 컴포넌트에서 클릭 이벤트 처리 개선
  const handlePostClick = (post: Post) => {
    if (editingPostId) {
      // 수정 모드일 때는 게시글 선택 방지
      return
    }

    console.log("📝 [PostList] 게시글 클릭:", post.id)
    onSelectPost(post)
  }

  if (posts.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>게시글이 없습니다.</p>
        <p className="text-sm mt-2">첫 번째 게시글을 작성해보세요!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {posts.map((post) => (
        <Card
          key={post.id}
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg glass-effect border-0 ${
            selectedPost?.id === post.id ? "ring-2 ring-purple-500 bg-purple-50/50" : "bg-white/50 hover:bg-white/70"
          }`}
          onClick={() => handlePostClick(post)}
        >
          <CardContent className="p-4">
            {editingPostId === post.id ? (
              // 수정 모드
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getCategoryInfo(editCategory).color}`}
                  >
                    {getCategoryInfo(editCategory).icon}
                    {getCategoryInfo(editCategory).label}
                  </span>
                </div>
                
                {/* 카테고리 선택 */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">카테고리:</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    disabled={isSubmitting}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="free">자유게시판</option>
                    <option value="notice">공지사항</option>
                    <option value="report">신고/문의</option>
                    <option value="suggestion">개선제안</option>
                    <option value="review">이용후기</option>
                  </select>
                </div>
                
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  disabled={isSubmitting}
                  className="glass-effect border-0 bg-white/70"
                />
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  disabled={isSubmitting}
                  className="glass-effect border-0 bg-white/70 min-h-[100px] resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={(e) => handleSave(e, post.id)}
                    disabled={isSubmitting || !editTitle.trim() || !editContent.trim()}
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isSubmitting ? "저장 중..." : "저장"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={isSubmitting}
                    size="sm"
                    className="glass-effect border-0 bg-white/50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              // 일반 모드
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getCategoryInfo(post.category).color} shadow-md`}
                      >
                        {getCategoryInfo(post.category).icon}
                        {getCategoryInfo(post.category).label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                  </div>
                  {/* 🔥 권한 체크 개선 - 항상 표시하되 권한에 따라 활성화/비활성화 */}
                  {canEdit(post) && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEdit(e, post)}
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 border border-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, post.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{post.author}</span>
                    <span>•</span>
                    <span>{formatDate(post.createdAt)}</span>
                    {post.updatedAt !== post.createdAt && <span className="text-purple-500">(수정됨)</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleLike(e, post.id)}
                      className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                        post.liked ? "text-red-500" : "text-gray-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />
                      <span>{post.likes}</span>
                    </button>

                    <div className="flex items-center gap-1 text-gray-500">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.commentCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
