import { useEffect, useState, useCallback } from 'react'
import { useNotebooks } from '../../hooks/useNotebooks'
import { useSections } from '../../hooks/useNotebooks'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, BookOpen, Trash2, Pencil, MoreHorizontal,
  BookMarked, ChevronRight, ChevronDown, Hash, Loader2, Eye
} from 'lucide-react'
import { Modal, ConfirmModal, Skeleton } from '../ui/Toast'
import { SECTION_COLORS, formatDate } from '../../lib/utils'

const PALETTE = [
  '#15803d','#16a34a','#22c55e','#4ade80',
  '#0d9488','#0891b2','#7c3aed','#db2777',
  '#ea580c','#ca8a04','#64748b','#374151',
]

/* ─── Main Notebook List with inline Sections ─────────────── */
export default function NotebookList({ onSelectSection }) {
  const { notebooks, loading, fetchNotebooks, fetchAdminNotebooks, createNotebook, updateNotebook, deleteNotebook } = useNotebooks()
  const { profile, isAdmin } = useAuth()
  const { activeNotebook, setActiveNotebook, activeSection, showToast } = useApp()

  const [expanded, setExpanded] = useState({})
  const [sharedNotebooks, setSharedNotebooks] = useState([])
  const [sharedExpanded, setSharedExpanded] = useState({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editNotebook, setEditNotebook] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [addSectionFor, setAddSectionFor] = useState(null)

  useEffect(() => {
    if (profile) {
      fetchNotebooks()
      if (!isAdmin) {
        fetchAdminNotebooks().then(rows => {
          if (rows) setSharedNotebooks(rows)
        })
      }
    }
  }, [profile])

  // Auto-expand active notebook
  useEffect(() => {
    if (activeNotebook) {
      setExpanded(prev => ({ ...prev, [activeNotebook.id]: true }))
    }
  }, [activeNotebook?.id])

  const handleCreate = async (title, color) => {
    try {
      const nb = await createNotebook(title, color, '📓')
      setCreateOpen(false)
      setActiveNotebook(nb)
      setExpanded(prev => ({ ...prev, [nb.id]: true }))
      showToast('Notebook created')
    } catch (e) { showToast(e.message, 'error') }
  }

  const toggleExpand = (nbId) => {
    setExpanded(prev => ({ ...prev, [nbId]: !prev[nbId] }))
  }

  return (
    <div className="flex flex-col h-full app-notebook-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Notebooks</span>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))
          : notebooks.length === 0
            ? <EmptyState onAction={() => setCreateOpen(true)} label="No notebooks yet" action="Create one" />
            : notebooks.map((nb) => (
                <NotebookRow
                  key={nb.id}
                  nb={nb}
                  expanded={!!expanded[nb.id]}
                  onToggle={() => setExpanded(prev => ({ ...prev, [nb.id]: !prev[nb.id] }))}
                  onSelectSection={onSelectSection}
                  onEdit={() => { setEditNotebook(nb); setMenuId(null) }}
                  onDelete={() => { setDeleteId(nb.id); setMenuId(null) }}
                  onAddSection={() => { setAddSectionFor(nb.id); setMenuId(null) }}
                  menuOpen={menuId === nb.id}
                  onMenuToggle={() => setMenuId(menuId === nb.id ? null : nb.id)}
                  onMenuClose={() => setMenuId(null)}
                />
              ))
        }

        {/* Shared by Admin — only visible to employees */}
        {!isAdmin && sharedNotebooks.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100">
              <Eye className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Shared by Admin</span>
            </div>
            {sharedNotebooks.map((nb) => (
              <SharedNotebookRow
                key={nb.id}
                nb={nb}
                expanded={!!sharedExpanded[nb.id]}
                onToggle={() => setSharedExpanded(prev => ({ ...prev, [nb.id]: !prev[nb.id] }))}
                onSelectSection={(s) => onSelectSection(s, true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NotebookFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      {editNotebook && (
        <NotebookFormModal open onClose={() => setEditNotebook(null)}
          onSave={async (title, color) => {
            try { await updateNotebook(editNotebook.id, { title, color }); setEditNotebook(null); showToast('Updated') }
            catch (e) { showToast(e.message, 'error') }
          }}
          initialData={editNotebook} />
      )}
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { await deleteNotebook(deleteId); showToast('Deleted') }}
        title="Delete Notebook" message="All sections and pages inside will be permanently deleted." danger />

      {/* Add Section inline modal */}
      {addSectionFor && (
        <AddSectionModal
          notebookId={addSectionFor}
          onClose={() => setAddSectionFor(null)}
          onCreated={(section) => {
            setAddSectionFor(null)
            setExpanded(prev => ({ ...prev, [addSectionFor]: true }))
            onSelectSection(section)
            showToast('Section created')
          }}
        />
      )}
    </div>
  )
}

/* ─── Single Notebook Row with expandable Sections ─────────── */
function NotebookRow({ nb, expanded, onToggle, onSelectSection, onEdit, onDelete, onAddSection, menuOpen, onMenuToggle, onMenuClose }) {
  const { activeSection, activeNotebook, setActiveNotebook } = useApp()
  const { sections, loading: sectionsLoading, fetchSections, createSection, updateSection, deleteSection } = useSections()
  const { showToast } = useApp()

  const [editSection, setEditSection] = useState(null)
  const [deleteSectionId, setDeleteSectionId] = useState(null)
  const [sectionMenuId, setSectionMenuId] = useState(null)

  const isActiveNb = activeNotebook?.id === nb.id

  // Fetch sections when expanded
  useEffect(() => {
    if (expanded) fetchSections(nb.id)
  }, [expanded, nb.id])

  const handleNotebookClick = () => {
    setActiveNotebook(nb)
    onToggle()
  }

  return (
    <div className="select-none">
      {/* Notebook row */}
      <div
        className={`group relative flex items-center gap-1.5 px-3 py-2 cursor-pointer rounded-xl mx-1.5 mb-0.5 transition-all ${
          isActiveNb
            ? 'bg-brand-50 border border-brand-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
        onClick={handleNotebookClick}
      >
        {/* Expand chevron */}
        <span className="text-gray-400 flex-shrink-0 w-4 flex items-center justify-center">
          {expanded
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />}
        </span>

        {/* Color dot */}
        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: nb.color }} />

        {/* Title */}
        <span className={`flex-1 text-sm truncate font-medium ${isActiveNb ? 'text-gray-900' : 'text-gray-600'}`}>
          {nb.title}
        </span>

        {/* 3-dot menu */}
        <div
          className="opacity-0 group-hover:opacity-100 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
        >
          <button className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onMenuClose() }} />
              <div className="absolute right-2 top-7 w-40 bg-white border border-gray-200 rounded-xl shadow-lifted z-50 animate-scale-in overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); onAddSection() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5 text-brand-500" /> Add Section
                </button>
                <div className="h-px bg-gray-100 mx-2" />
                <button onClick={(e) => { e.stopPropagation(); onEdit() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-gray-400" /> Rename
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 font-medium transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sections — inline accordion */}
      {expanded && (
        <div className="ml-6 mr-1.5 mb-1 animate-slide-up">
          {sectionsLoading
            ? <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Loading…</span>
              </div>
            : sections.length === 0
              ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddSection() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium border border-dashed border-brand-200 hover:border-brand-400"
                >
                  <Plus className="w-3 h-3" /> Add Section
                </button>
              )
              : (
                <>
                  {sections.map((s) => {
                    const isActive = activeSection?.id === s.id
                    return (
                      <div
                        key={s.id}
                        onClick={(e) => { e.stopPropagation(); onSelectSection(s) }}
                        className={`group/sec relative flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all mb-0.5 ${
                          isActive
                            ? 'bg-white border border-gray-200 shadow-soft'
                            : 'hover:bg-white/70 border border-transparent'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className={`flex-1 text-xs truncate font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {s.title}
                        </span>

                        {/* Section 3-dot */}
                        <div
                          className="opacity-0 group-hover/sec:opacity-100 flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); setSectionMenuId(sectionMenuId === s.id ? null : s.id) }}
                        >
                          <button className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all">
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                          {sectionMenuId === s.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setSectionMenuId(null) }} />
                              <div className="absolute right-0 top-6 w-36 bg-white border border-gray-200 rounded-xl shadow-lifted z-50 animate-scale-in overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); setEditSection(s); setSectionMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 font-medium">
                                  <Pencil className="w-3 h-3 text-gray-400" /> Rename
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteSectionId(s.id); setSectionMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 font-medium">
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Add section below last section */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddSection() }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium mt-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Section
                  </button>
                </>
              )
          }
        </div>
      )}

      {/* Edit section modal */}
      {editSection && (
        <SectionFormModal
          open
          onClose={() => setEditSection(null)}
          initialData={editSection}
          onSave={async (title, color) => {
            await updateSection(editSection.id, { title, color })
            setEditSection(null)
            showToast('Section updated')
          }}
        />
      )}
      <ConfirmModal
        open={!!deleteSectionId}
        onClose={() => setDeleteSectionId(null)}
        onConfirm={async () => { await deleteSection(deleteSectionId); showToast('Section deleted') }}
        title="Delete Section" message="All pages in this section will be permanently deleted." danger
      />
    </div>
  )
}

/* ─── Add Section Modal (standalone, by notebookId) ──────── */
function AddSectionModal({ notebookId, onClose, onCreated }) {
  const { createSection } = useSections()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const s = await createSection(notebookId, title, color)
      onCreated(s)
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="New Section" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white border border-gray-300 focus:border-brand-500 rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none transition-all placeholder-gray-400"
          placeholder="Section name" />
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-400 scale-110' : 'hover:scale-105'}`} />
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Cancel</button>
          <button type="submit" disabled={!title.trim() || saving}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors shadow-sm">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Section Form Modal (edit) ───────────────────────────── */
function SectionFormModal({ open, onClose, onSave, initialData }) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [color, setColor] = useState(initialData?.color || PALETTE[0])

  return (
    <Modal open={open} onClose={onClose} title="Rename Section" size="sm">
      <form onSubmit={async (e) => { e.preventDefault(); if (title.trim()) await onSave(title, color) }} className="space-y-4">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white border border-gray-300 focus:border-brand-500 rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none transition-all placeholder-gray-400"
          placeholder="Section name" />
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-400 scale-110' : 'hover:scale-105'}`} />
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Cancel</button>
          <button type="submit" disabled={!title.trim()}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors shadow-sm">
            Update
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Notebook Form Modal ─────────────────────────────────── */
function NotebookFormModal({ open, onClose, onSave, initialData }) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [color, setColor] = useState(initialData?.color || PALETTE[0])
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try { await onSave(title, color) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Notebook' : 'New Notebook'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-400 scale-110' : 'hover:scale-105'}`} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white border border-gray-300 focus:border-brand-500 rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none transition-all placeholder-gray-400"
            placeholder="Notebook name" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Cancel</button>
          <button type="submit" disabled={!title.trim() || saving}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors shadow-sm">
            {saving ? 'Saving…' : initialData ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Shared (read-only) Notebook Row for employees ─────── */
function SharedNotebookRow({ nb, expanded, onToggle, onSelectSection }) {
  const { sections, loading: sectionsLoading, fetchSections } = useSections()

  useEffect(() => {
    if (expanded) fetchSections(nb.id)
  }, [expanded, nb.id])

  return (
    <div className="select-none">
      <div
        className="group flex items-center gap-1.5 px-3 py-2 cursor-pointer rounded-xl mx-1.5 mb-0.5 transition-all hover:bg-purple-50 border border-transparent hover:border-purple-100"
        onClick={onToggle}
      >
        <span className="text-gray-400 flex-shrink-0 w-4 flex items-center justify-center">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: nb.color }} />
        <span className="flex-1 text-sm truncate font-medium text-gray-600">{nb.title}</span>
        <Eye className="w-3 h-3 text-purple-400 flex-shrink-0 opacity-60" />
      </div>

      {expanded && (
        <div className="ml-6 mr-1.5 mb-1">
          {sectionsLoading
            ? <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Loading…</span>
              </div>
            : sections.length === 0
              ? <p className="text-xs text-gray-400 px-3 py-2">No sections yet</p>
              : sections.map((s) => (
                  <div
                    key={s.id}
                    onClick={(e) => { e.stopPropagation(); onSelectSection(s) }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all mb-0.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 border border-transparent"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="flex-1 text-xs truncate font-medium">{s.title}</span>
                    <Eye className="w-3 h-3 text-purple-300 flex-shrink-0" />
                  </div>
                ))
          }
        </div>
      )}
    </div>
  )
}

export function EmptyState({ label, action, onAction, icon: Icon = BookOpen }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-10 h-10 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-brand-500" />
      </div>
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      {action && onAction && (
        <button onClick={onAction} className="text-brand-600 text-xs font-semibold mt-2 hover:text-brand-700 transition-colors">
          + {action}
        </button>
      )}
    </div>
  )
}
