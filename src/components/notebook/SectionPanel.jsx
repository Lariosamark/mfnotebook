import { useEffect, useState } from 'react'
import { usePages } from '../../hooks/useNotebooks'
import { useApp } from '../../contexts/AppContext'
import { Plus, Pin, PinOff, X } from 'lucide-react'
import { ConfirmModal } from '../ui/Toast'
import { useAuth } from '../../contexts/AuthContext'

/* ─── Page Tabs bar ─── */
export function PageTabs({ section, onSelectPage, viewerMode = false }) {
  const { pages, loading, fetchPages, clearPages, createPage, updatePage, deletePage } = usePages()
  const { activePage, showToast } = useApp()
  const { isAdmin } = useAuth()
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (section) {
      fetchPages(section.id)
    } else {
      clearPages()
    }
  }, [section?.id])

  if (!section) return null

  const handleCreate = async () => {
    try {
      const p = await createPage(section.id)
      onSelectPage(p)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <>
      {/* Tab bar — fixed height, no wrap, horizontal scroll */}
      <div
        className="flex items-stretch border-b border-gray-200 bg-white flex-shrink-0 overflow-hidden"
        style={{ minHeight: '42px', maxHeight: '42px' }}
      >
        {/* Section color indicator */}
        <div className="flex items-center px-2 sm:px-3 border-r border-gray-200 flex-shrink-0">
          <div
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm flex-shrink-0"
            style={{ backgroundColor: section.color }}
          />
        </div>

        {/* Scrollable tabs row */}
        <div
          className="flex items-end flex-1 overflow-x-auto overflow-y-hidden px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.tab-scroll::-webkit-scrollbar { display: none; }`}</style>

          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-5 w-20 sm:w-24 rounded bg-gray-100 animate-pulse mx-1 my-auto flex-shrink-0"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))
            : pages.map((p) => {
                const isActive = activePage?.id === p.id
                return (
                  <div
                    key={p.id}
                    className={`group relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 cursor-pointer whitespace-nowrap transition-all flex-shrink-0 text-xs font-medium border-b-2 mx-0.5 select-none ${
                      isActive
                        ? 'text-brand-700 border-brand-500 bg-brand-50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectPage(p)}
                  >
                    {p.is_pinned && (
                      <Pin className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="max-w-[80px] sm:max-w-[120px] truncate">
                      {p.title || 'Untitled'}
                    </span>

                    {/* Actions — shown on hover for non-viewer */}
                    {!viewerMode && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-0.5 flex-shrink-0 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updatePage(p.id, { is_pinned: !p.is_pinned })
                          }}
                          className="p-0.5 rounded hover:bg-amber-100 text-gray-300 hover:text-amber-500 transition-colors"
                          title={p.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          {p.is_pinned
                            ? <PinOff className="w-3 h-3" />
                            : <Pin className="w-3 h-3" />
                          }
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteId(p.id)
                          }}
                          className="p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete page"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Touch-friendly long-press hint — mobile only */}
                    {/* On mobile, show a subtle delete button always when active and not viewer */}
                    {!viewerMode && isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(p.id)
                        }}
                        className="sm:hidden p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors ml-0.5"
                        title="Delete page"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })
          }
        </div>

        {/* Add page — hidden for viewer mode */}
        {!viewerMode && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 px-2 sm:px-3 h-full text-xs text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0 font-semibold border-l border-gray-200"
            title="New Page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Page</span>
          </button>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          await deletePage(deleteId)
          showToast('Page deleted')
        }}
        title="Delete Page"
        message="This page will be permanently deleted."
        danger
      />
    </>
  )
}