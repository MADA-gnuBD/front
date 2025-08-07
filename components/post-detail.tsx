"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Heart, MessageCircle, Edit, Trash2, Save, X, Send } from "lucide-react"

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
  comments: Comment[]
}

interface Comment {
  id: string
  content: string
  author: string
  authorId: string
  likes: number
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface PostDetailProps {
  post: Post
  onLikePost: (postId: string) => void
  onEditPost: (postId: string, postData: { title: string; content: string; category?: string }) => Promise<boolean>
  onDeletePost: (postId: string) => Promise<boolean>
  onAddComment: (postId: string, content: string) => Promise<boolean>
  onDeleteComment: (postId: string, commentId: string) => Promise<boolean>
  onEditComment: (postId: string, commentId: string, newContent: string) => Promise<boolean>
  currentUser: User
}

export function PostDetail({ post, onLikePost, onEditPost, onDeletePost, onAddComment, onDeleteComment, onEditComment, currentUser }: PostDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [editCategory, setEditCategory] = useState(post.category)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState("")

  // 🔥 안전한 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    try {
      // 다양한 날짜 형식 처리
      let date: Date

      if (!dateString || dateString === "Invalid Date") {
        date = new Date()
      } else if (typeof dateString === "string") {
        // ISO 형식이 아닌 경우 처리
        date = new Date(dateString)

        // 유효하지 않은 날짜인 경우
        if (isNaN(date.getTime())) {
          console.warn("Invalid date string:", dateString)
          date = new Date()
        }
      } else {
        date = new Date()
      }

      return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Date formatting error:", error, "for date:", dateString)
      return new Date().toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
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

  const handleEdit = () => {
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditCategory(post.category)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.")
      return
    }

    setIsSubmitting(true)
    try {
      const success = await onEditPost(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
      })
      if (success) {
        setIsEditing(false)
      }
    } catch (error) {
      console.error("게시글 수정 오류:", error)
      alert("게시글 수정 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditCategory(post.category)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    await onDeletePost(post.id)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert("댓글 내용을 입력해주세요.")
      return
    }

    setIsAddingComment(true)
    try {
      const success = await onAddComment(post.id, newComment.trim())
      if (success) {
        setNewComment("")
      }
    } catch (error) {
      console.error("댓글 작성 오류:", error)
      alert("댓글 작성 중 오류가 발생했습니다.")
    } finally {
      setIsAddingComment(false)
    }
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditCommentContent(comment.content)
  }

  const handleSaveComment = async (commentId: string) => {
    if (!editCommentContent.trim()) {
      alert("댓글 내용을 입력해주세요.")
      return
    }

    try {
      const success = await onEditComment(post.id, commentId, editCommentContent)
      if (success) {
        setEditingCommentId(null)
        setEditCommentContent("")
      }
    } catch (error) {
      console.error("댓글 수정 오류:", error)
      alert("댓글 수정에 실패했습니다.")
    }
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditCommentContent("")
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await onDeleteComment(post.id, commentId)
    } catch (error) {
      console.error("댓글 삭제 오류:", error)
      alert("댓글 삭제에 실패했습니다.")
    }
  }

  // 🔥 권한 체크 로직 개선
  const canEdit = (() => {
    const isAdmin = currentUser.role === "admin"
    // ID 비교 (문자열로 통일)
    const isAuthorById = String(currentUser.id) === String(post.authorId)
    // 이메일 비교 (백업)
    const isAuthorByEmail = currentUser.email === post.author

    console.log("🔍 [PostDetail] 권한 체크:", {
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
  })()

  const canEditComment = (comment: Comment) => {
    const isAdmin = currentUser.role === "admin"
    // ID 비교 (문자열로 통일)
    const isAuthorById = String(currentUser.id) === String(comment.authorId)
    // 이메일 비교 (백업)
    const isAuthorByEmail = currentUser.email === comment.author

    console.log("🔍 [PostDetail] 댓글 권한 체크:", {
      commentId: comment.id,
      commentAuthorId: comment.authorId,
      commentAuthor: comment.author,
      currentUserId: currentUser.id,
      currentUserEmail: currentUser.email,
      isAdmin,
      isAuthorById,
      isAuthorByEmail,
      canEdit: isAdmin || isAuthorById || isAuthorByEmail,
    })

    return isAdmin || isAuthorById || isAuthorByEmail
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-white/20">
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                disabled={isSubmitting}
                className="text-lg font-semibold glass-effect border-0 bg-white/50"
              />
              
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
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting || !editTitle.trim() || !editContent.trim()}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSubmitting}
                  size="sm"
                  className="glass-effect border-0 bg-white/50"
                >
                  <X className="h-4 w-4 mr-1" />
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getCategoryInfo(post.category).color} shadow-lg`}
                    >
                      {getCategoryInfo(post.category).icon}
                      {getCategoryInfo(post.category).label}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h1>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={handleEdit}
                      variant="outline"
                      size="sm"
                      className="glass-effect border-0 bg-white/50 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      onClick={handleDelete}
                      variant="outline"
                      size="sm"
                      className="glass-effect border-0 bg-white/50 hover:bg-red-50 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span className="font-medium">{post.author}</span>
                  <span>{formatDate(post.createdAt)}</span>
                  {post.updatedAt !== post.createdAt && <span className="text-purple-500">(수정됨)</span>}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onLikePost(post.id)}
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
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 flex flex-col">
        {/* 게시글 내용 */}
        <div className="flex-1 mb-6">
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="내용을 입력하세요"
              disabled={isSubmitting}
              className="w-full h-full min-h-[300px] resize-none border-0 p-0 focus-visible:ring-0 glass-effect bg-white/50"
            />
          ) : (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{post.content}</div>
            </div>
          )}
        </div>

        {/* 댓글 섹션 */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-600" />
            댓글 {post.comments?.length || 0}개
          </h3>

          {/* 댓글 작성 */}
          <div className="mb-6">
            <div className="flex gap-3">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                disabled={isAddingComment}
                className="flex-1 glass-effect border-0 bg-white/50"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={isAddingComment || !newComment.trim()}
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white"
              >
                <Send className="h-4 w-4 mr-1" />
                {isAddingComment ? "작성 중..." : "댓글"}
              </Button>
            </div>
          </div>

          {/* 🔥 댓글 목록 - React.Fragment로 key 문제 해결 */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {post.comments && post.comments.length > 0 ? (
              <>
                {post.comments.map((comment) => (
                  <div key={`comment-${comment.id}`} className="glass-effect bg-white/30 rounded-lg p-4">
                    {editingCommentId === comment.id ? (
                      // 댓글 수정 모드
                      <div key={`edit-${comment.id}`} className="space-y-3">
                        <Textarea
                          value={editCommentContent}
                          onChange={(e) => setEditCommentContent(e.target.value)}
                          placeholder="댓글을 수정하세요"
                          className="glass-effect border-0 bg-white/50 min-h-[80px] resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleSaveComment(comment.id)}
                            disabled={!editCommentContent.trim()}
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            저장
                          </Button>
                          <Button
                            onClick={handleCancelEditComment}
                            variant="outline"
                            size="sm"
                            className="glass-effect border-0 bg-white/50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 댓글 일반 모드
                      <div key={`view-${comment.id}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{comment.author}</span>
                            <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {canEditComment(comment) && (
                              <div className="flex items-center gap-1">
                                <Button
                                  onClick={() => handleEditComment(comment)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-800 leading-relaxed">{comment.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              // 🔥 빈 댓글 상태
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>아직 댓글이 없습니다.</p>
                <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  )
}
