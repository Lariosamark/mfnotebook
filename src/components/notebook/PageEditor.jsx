import { useEffect, useState, useCallback, useRef } from 'react'
import { usePages } from '../../hooks/useNotebooks'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import NoteEditor from './NoteEditor'
import { Avatar } from '../layout/Sidebar'
import { Pin, PinOff, MessageSquare, Send, Trash2, Loader2, FileText, CheckCircle2, Clock, X, Sparkles } from 'lucide-react'
import { formatDate, formatRelative } from '../../lib/utils'
import { ConfirmModal } from '../ui/Toast'

export default function PageEditor({ page, onUpdate, viewerMode = false }) {
  const { updatePage, fetchComments, addComment, deleteComment } = usePages()
  const { profile, isAdmin } = useAuth()
  const { showToast } = useApp()

  const [title, setTitle]                       = useState(page?.title || '')
  const [content, setContent]                   = useState(page?.content || '')
  const [saving, setSaving]                     = useState(false)
  const [saved, setSaved]                       = useState(false)
  const [comments, setComments]                 = useState([])
  const [commentText, setCommentText]           = useState('')
  const [showComments, setShowComments]         = useState(false)
  const [loadingComments, setLoadingComments]   = useState(false)
  const [deleteCommentId, setDeleteCommentId]   = useState(null)
  const saveTimer                               = useRef(null)

  // In viewer mode, always show comments panel
  useEffect(() => {
    if (viewerMode && page) setShowComments(true)
  }, [viewerMode, page?.id])

  useEffect(() => {
    if (page) {
      setTitle(page.title)
      setContent(page.content || '')
      setSaved(false)
    } else {
      // page was cleared (e.g. switched notebooks) — reset editor state
      setTitle('')
      setContent('')
      setSaved(false)
    }
  }, [page?.id])

  useEffect(() => {
    if (showComments && page) loadComments()
  }, [showComments, page?.id])

  const loadComments = async () => {
    setLoadingComments(true)
    try { setComments(await fetchComments(page.id)) }
    finally { setLoadingComments(false) }
  }

  const scheduleAutoSave = useCallback((newTitle, newContent) => {
    clearTimeout(saveTimer.current)
    setSaved(false)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const updated = await updatePage(page.id, { title: newTitle, content: newContent })
        onUpdate?.(updated)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch { showToast('Failed to save', 'error') }
      finally { setSaving(false) }
    }, 800)
  }, [page?.id])

  if (!page) return (
    <div className="flex flex-col items-center justify-center h-full app-editor-area text-center p-10">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center mb-5">
        <FileText className="w-7 h-7 text-brand-400" />
      </div>
      <h3 className="font-display font-semibold text-gray-500 mb-1.5 text-lg">No page selected</h3>
      <p className="text-gray-400 text-sm max-w-xs">Choose a page from the panel on the left, or create a new one to start writing</p>
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-300">
        <Sparkles className="w-3.5 h-3.5 text-brand-300" />
        <span>Your notes are auto-saved as you type</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full app-editor-area">
      {/* Page header / title area */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white">
        {/* Title */}
        {viewerMode ? (
          <div className="page-title-input text-gray-700 select-text cursor-default">{title || 'Untitled Page'}</div>
        ) : (
          <input value={title}
            onChange={(e) => { setTitle(e.target.value); scheduleAutoSave(e.target.value, content) }}
            className="page-title-input"
            placeholder="Untitled Page" />
        )}

        {/* Metadata bar */}
        <div className="flex items-center gap-3 px-6 pb-2.5">
          {viewerMode ? (
            <span className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
              👁 View Only
            </span>
          ) : (
            <div className={`flex items-center gap-1.5 text-xs transition-all ${
              saving ? 'text-amber-500' : saved ? 'text-brand-600' : 'text-gray-400'
            }`}>
              {saving
                ? <><Loader2 className="w-3 h-3 animate-spin" /><span>Saving…</span></>
                : saved
                  ? <><CheckCircle2 className="w-3 h-3" /><span>Saved</span></>
                  : <><Clock className="w-3 h-3" /><span>{formatDate(page.updated_at)}</span></>
              }
            </div>
          )}

          <div className="w-px h-3 bg-gray-200" />

          {!viewerMode && (
            <button
              onClick={async () => { await updatePage(page.id, { is_pinned: !page.is_pinned }); showToast(page.is_pinned ? 'Unpinned' : 'Pinned') }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                page.is_pinned
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              title={page.is_pinned ? 'Unpin' : 'Pin'}>
              {page.is_pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
              <span>{page.is_pinned ? 'Pinned' : 'Pin'}</span>
            </button>
          )}

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showComments
                ? 'bg-brand-100 text-brand-700 border border-brand-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
            }`}>
            <MessageSquare className="w-3 h-3" />
            Comments
            {comments.length > 0 && (
              <span className="bg-brand-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">{comments.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Content + comments */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className={`flex-1 overflow-hidden ${showComments ? 'border-r border-gray-100' : ''}`}>
          <NoteEditor content={content}
            onChange={viewerMode ? undefined : (html) => { setContent(html); scheduleAutoSave(title, html) }}
            readOnly={viewerMode} />
        </div>

        {/* Comments panel */}
        {showComments && (
          <div className="w-72 flex flex-col bg-gray-50 flex-shrink-0 animate-slide-in-right border-l border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-500" /> Comments
                </h3>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold border border-purple-200">Admin</span>
                  )}
                  {!viewerMode && (
                    <button onClick={() => setShowComments(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {viewerMode && <p className="text-xs text-gray-400 mt-0.5">Leave a reply or comment below</p>}
              {!isAdmin && !viewerMode && <p className="text-xs text-gray-400 mt-0.5">Admin feedback appears here</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {loadingComments
                ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
                : comments.length === 0
                  ? <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-2">
                        <MessageSquare className="w-4 h-4 text-gray-300" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">No comments yet</p>
                      <p className="text-gray-400 text-xs mt-1">Be the first to leave a comment</p>
                    </div>
                  : comments.map((c) => (
                      <div key={c.id} className="group bg-white border border-gray-200 rounded-xl p-3 animate-fade-in shadow-soft">
                        <div className="flex items-start gap-2.5 mb-2">
                          <Avatar name={c.full_name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-800">{c.full_name}</p>
                              {c.commenter_role === 'admin' && (
                                <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0 rounded-full font-medium border border-purple-200">Admin</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{formatRelative(c.created_at)}</p>
                          </div>
                          {isAdmin && (
                            <button onClick={() => setDeleteCommentId(c.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{c.comment}</p>
                      </div>
                    ))
              }
            </div>

            {/* Comment form — available to ALL users (admin + employee) */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!commentText.trim()) return
                try {
                  await addComment(page.id, profile.id, commentText)
                  setCommentText('')
                  await loadComments()
                  showToast('Comment posted')
                } catch (err) { showToast(err.message, 'error') }
              }} className="space-y-2">
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) e.currentTarget.form.requestSubmit() }}
                  rows={3} placeholder={isAdmin ? 'Write feedback… (Ctrl+Enter)' : 'Write a reply… (Ctrl+Enter)'}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-brand-400 focus:shadow-glow rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none transition-all" />
                <button type="submit" disabled={!commentText.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-sm">
                  <Send className="w-3.5 h-3.5" /> {isAdmin ? 'Post Comment' : 'Post Reply'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal open={!!deleteCommentId} onClose={() => setDeleteCommentId(null)}
        onConfirm={async () => { await deleteComment(deleteCommentId); setComments(prev => prev.filter(c => c.id !== deleteCommentId)); showToast('Deleted') }}
        title="Delete Comment" message="This comment will be permanently removed." danger />
    </div>
  )
}
