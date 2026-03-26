import { useEffect, useState } from 'react'
import { usePages } from '../../hooks/useNotebooks'
import { useApp } from '../../contexts/AppContext'
import { Plus, Trash2, Pin, PinOff, MoreHorizontal, X, FileText, Loader2 } from 'lucide-react'
import { ConfirmModal, Skeleton } from '../ui/Toast'
import { formatDate } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'

/* ─── Page Tabs bar (replaces old PageList + SectionTabs) ─── */
export function PageTabs({ section, onSelectPage, viewerMode = false }) {
  const { pages, loading, fetchPages, createPage, updatePage, deletePage } = usePages()
  const { activePage, showToast } = useApp()
  const { isAdmin } = useAuth()
  const [deleteId, setDeleteId] = useState(null)
  const [menuPageId, setMenuPageId] = useState(null)

  useEffect(() => { if (section) fetchPages(section.id) }, [section?.id])

  if (!section) return null

  const handleCreate = async () => {
    try {
      const p = await createPage(section.id)
      onSelectPage(p)
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <>
      <div className="flex items-center border-b border-gray-200 bg-white overflow-x-auto flex-shrink-0"
        style={{ minHeight: '38px' }}>

        {/* Section color pill */}
        <div className="flex items-center gap-1.5 px-3 border-r border-gray-200 flex-shrink-0 h-full">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.color }} />
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{section.title}</span>
        </div>

        {/* Page tabs */}
        <div className="flex items-end h-full overflow-x-auto flex-1 px-1">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-24 rounded bg-gray-100 animate-pulse mx-1 my-auto" />
              ))
            : pages.map((p) => {
                const isActive = activePage?.id === p.id
                return (
                  <div key={p.id}
                    className={`group relative flex items-center gap-1.5 px-3 py-1.5 cursor-pointer whitespace-nowrap transition-all flex-shrink-0 text-xs font-medium border-b-2 mx-0.5 ${
                      isActive
                        ? 'text-brand-700 border-brand-500 bg-brand-50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectPage(p)}
                  >
                    {p.is_pinned && <Pin className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />}
                    <span className="max-w-[120px] truncate">{p.title || 'Untitled'}</span>

                    {/* Pin + Delete buttons on hover */}
                    {!viewerMode && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-0.5 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); updatePage(p.id, { is_pinned: !p.is_pinned }) }}
                          className="p-0.5 rounded hover:bg-amber-100 text-gray-300 hover:text-amber-500 transition-all"
                          title={p.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          {p.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(p.id) }}
                          className="p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all"
                          title="Delete page"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
          }
        </div>

        {/* Add page button */}
        {!viewerMode && (
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 px-3 h-full text-xs text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0 font-semibold border-l border-gray-200"
          title="New Page"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Page</span>
        </button>
        )}
      </div>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { await deletePage(deleteId); showToast('Page deleted') }}
        title="Delete Page" message="This page will be permanently deleted." danger />
    </>
  )
}
