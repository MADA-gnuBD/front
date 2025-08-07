"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (postData: { title: string; content: string; category: string }) => Promise<boolean>
  currentUser?: { role: string; name: string }
}

export function CreatePostModal({ isOpen, onClose, onSubmit, currentUser }: CreatePostModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("free")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAdmin = currentUser?.role === "admin"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.")
      return
    }

    // 관리자가 아닌데 공지사항 선택한 경우 체크
    if (category === "notice" && !isAdmin) {
      alert("공지사항은 관리자만 작성할 수 있습니다.")
      return
    }

    console.log("📝 [CreatePostModal] 게시글 작성 데이터:", {
      title: title.trim(),
      content: content.trim(),
      category: category,
      isAdmin,
      currentUser: currentUser?.name,
    })

    setIsSubmitting(true)
    try {
      // 🔥 카테고리를 명시적으로 전달
      const success = await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category: category, // 선택된 카테고리를 명시적으로 전달
      })
      if (success) {
        setTitle("")
        setContent("")
        setCategory("free")
        onClose()
      }
    } catch (error) {
      console.error("게시글 작성 오류:", error)
      alert("게시글 작성 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle("")
      setContent("")
      setCategory("free")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] glass-effect border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            새 게시글 작성
            {isAdmin && <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white">👑 관리자</Badge>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                console.log("🔍 [CreatePostModal] 카테고리 변경:", e.target.value)
                setCategory(e.target.value)
              }}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 glass-effect bg-white/50"
            >
              <option value="free">💬 자유게시판</option>
              <option value="suggestion">💡 개선제안</option>
              <option value="report">🚨 신고/문의</option>
              <option value="review">⭐ 이용후기</option>
              {/* 관리자만 공지사항 선택 가능 */}
              {isAdmin && (
                <option value="notice" className="bg-red-50 text-red-700 font-semibold">
                  📢 공지사항 (관리자 전용)
                </option>
              )}
            </select>
            {category === "notice" && isAdmin && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                👑 관리자 권한으로 공지사항을 작성합니다.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              제목
              {category === "notice" && <span className="ml-2 text-red-600 font-semibold">[공지]</span>}
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={category === "notice" ? "공지사항 제목을 입력하세요" : "게시글 제목을 입력하세요"}
              disabled={isSubmitting}
              className={`glass-effect border-0 bg-white/50 focus:bg-white/70 transition-all duration-300 ${
                category === "notice" ? "border-red-200 focus:ring-red-500" : ""
              }`}
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              내용
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={category === "notice" ? "중요한 공지사항 내용을 입력하세요..." : "게시글 내용을 입력하세요"}
              disabled={isSubmitting}
              className="glass-effect border-0 bg-white/50 focus:bg-white/70 transition-all duration-300 min-h-[200px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="glass-effect border-0 bg-white/50 hover:bg-white/70"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className={`text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
                category === "notice"
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : "bg-gradient-to-r from-purple-500 to-blue-600"
              }`}
            >
              {isSubmitting ? "작성 중..." : category === "notice" ? "📢 공지사항 작성" : "게시글 작성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
