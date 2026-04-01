import { useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useNotebooks } from '../../hooks/useNotebooks'
import { useSections } from '../../hooks/useNotebooks'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, BookOpen, Trash2, Pencil, MoreHorizontal,
  BookMarked, ChevronRight, ChevronDown, Loader2, Eye,
  Users, UserCheck, UserX, Globe, Save, Lock, Search,
  CheckCircle2, X
} from 'lucide-react'
import { Modal, ConfirmModal, Skeleton } from '../ui/Toast'
import { SECTION_COLORS, formatDate } from '../../lib/utils'
import { useUsers } from '../../hooks/useFolders'

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

  const [expanded, setExpanded]           = useState({})
  const [sharedNotebooks, setSharedNotebooks] = useState([])
  const [sharedExpanded, setSharedExpanded]   = useState({})
  const [createOpen, setCreateOpen]       = useState(false)
  const [editNotebook, setEditNotebook]   = useState(null)
  const [deleteId, setDeleteId]           = useState(null)
  const [menuId, setMenuId]               = useState(null)
  const [addSectionFor, setAddSectionFor] = useState(null)
  const [accessNotebook, setAccessNotebook] = useState(null) // notebook to manage access for

  const refreshShared = () => {
    fetchAdminNotebooks().then(rows => { if (rows) setSharedNotebooks(rows) })
  }

  useEffect(() => {
    if (profile) {
      fetchNotebooks()
      refreshShared()
    }
  }, [profile])

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
                  onManageAccess={() => { setAccessNotebook(nb); setMenuId(null) }}
                  menuOpen={menuId === nb.id}
                  onMenuToggle={() => setMenuId(menuId === nb.id ? null : nb.id)}
                  onMenuClose={() => setMenuId(null)}
                />
              ))
        }

        {/* Shared with Me — visible to all users */}
        {sharedNotebooks.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100">
              <Eye className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Shared with Me</span>
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

      {/* Access Management Modal */}
      {accessNotebook && (
        <NotebookAccessModal
          notebook={accessNotebook}
          onClose={() => setAccessNotebook(null)}
          onSaved={() => { showToast('Access updated'); refreshShared() }}
        />
      )}
    </div>
  )
}

/* ─── Single Notebook Row ───────────────────────────────────── */
function NotebookRow({ nb, expanded, onToggle, onSelectSection, onEdit, onDelete, onAddSection, onManageAccess, menuOpen, onMenuToggle, onMenuClose }) {
  const { activeSection, activeNotebook, setActiveNotebook, setActiveSection, setActivePage, setNotebookSwitching } = useApp()
  const { sections, loading: sectionsLoading, fetchSections, createSection, updateSection, deleteSection } = useSections()
  const { showToast } = useApp()
  const { isAdmin } = useAuth()

  const [editSection, setEditSection]       = useState(null)
  const [deleteSectionId, setDeleteSectionId] = useState(null)
  const [sectionMenuId, setSectionMenuId]   = useState(null)

  const isActiveNb = activeNotebook?.id === nb.id

  useEffect(() => {
    if (expanded) {
      fetchSections(nb.id).finally(() => {
        // Once sections are loaded, clear the switching state
        setNotebookSwitching(false)
      })
    }
  }, [expanded, nb.id])

  const handleNotebookClick = () => {
    if (!isActiveNb) {
      // Switching to a different notebook — signal loading and clear stale state
      setNotebookSwitching(true)
      setActiveNotebook(nb)
      setActiveSection(null)
      setActivePage(null)
    }
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
        <span className="text-gray-400 flex-shrink-0 w-4 flex items-center justify-center">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>

        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: nb.color }} />

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
              <div className="absolute right-2 top-7 w-44 bg-white border border-gray-200 rounded-xl shadow-lifted z-50 animate-scale-in overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); onAddSection() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5 text-brand-500" /> Add Section
                </button>

                <div className="h-px bg-gray-100 mx-2" />

                <button onClick={(e) => { e.stopPropagation(); onEdit() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-gray-400" /> Rename
                </button>

                {/* Share with Teammates — available to all users */}
                <button onClick={(e) => { e.stopPropagation(); onManageAccess() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 font-medium transition-colors">
                  <Users className="w-3.5 h-3.5 text-purple-500" /> Share with…
                </button>

                <div className="h-px bg-gray-100 mx-2" />

                <button onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 font-medium transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sections */}
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

/* ─── Notebook Access Modal ─────────────────────────────────── */
function NotebookAccessModal({ notebook, onClose, onSaved }) {
  const { users, fetchUsers } = useUsers()
  const { fetchNotebookAccess, setNotebookAccess } = useNotebooks()
  const { profile } = useAuth()
  // Show all users except yourself
  const teammates = users.filter(u => u.id !== profile?.id)

  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [dirty, setDirty]       = useState(false)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (!notebook) return
    setLoading(true)
    setDirty(false)
    fetchNotebookAccess(notebook.id).then(ids => {
      setSelected(new Set(ids))
    }).finally(() => setLoading(false))
  }, [notebook?.id])

  const toggle = (uid) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setNotebookAccess(notebook.id, [...selected])
      setDirty(false)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const filtered = teammates.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  )

  const selectedCount = [...selected].filter(id => teammates.some(e => e.id === id)).length

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* ── Header with gradient ── */}
        <div className="relative px-6 pt-6 pb-5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
          {/* Close */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>

          {/* Notebook info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
              style={{ backgroundColor: notebook.color + '30', border: '2px solid rgba(255,255,255,0.3)' }}>
              {notebook.emoji || '📓'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white truncate">{notebook.title}</h2>
              <p className="text-xs text-green-200 mt-0.5">Share notebook access with teammates</p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
              <Users className="w-4 h-4 text-green-200 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-200">Total teammates</p>
                <p className="text-sm font-bold text-white">{teammates.length}</p>
              </div>
            </div>
            <div className={`flex-1 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
              selectedCount > 0 ? 'bg-white/25' : 'bg-white/15'
            }`}>
              <UserCheck className="w-4 h-4 text-green-200 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-200">Can view</p>
                <p className="text-sm font-bold text-white">{selectedCount}</p>
              </div>
            </div>
            <div className={`flex-1 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 ${
              selectedCount === 0 ? 'bg-white/25' : 'bg-white/15'
            }`}>
              <Lock className="w-4 h-4 text-green-200 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-200">Private</p>
                <p className="text-sm font-bold text-white">{selectedCount === 0 ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search + Quick actions ── */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-400 focus:bg-white transition-all" />
            </div>
            <button
              onClick={() => { setSelected(new Set(teammates.map(e => e.id))); setDirty(true) }}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors whitespace-nowrap shadow-sm">
              <Globe className="w-3.5 h-3.5" />All
            </button>
            <button
              onClick={() => { setSelected(new Set()); setDirty(true) }}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 font-semibold transition-colors whitespace-nowrap">
              <UserX className="w-3.5 h-3.5" />None
            </button>
          </div>
        </div>

        {/* ── Teammate list ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
              <p className="text-sm text-gray-400">Loading teammates…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-600 text-sm font-semibold">
                {search ? 'No teammates found' : 'No other users'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {search ? 'Try a different search term' : 'Invite teammates to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((emp) => {
                const isSelected = selected.has(emp.id)
                const initials = emp.full_name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all select-none group ${
                      isSelected
                        ? 'bg-brand-50 border border-brand-200 shadow-sm'
                        : 'bg-gray-50 border border-transparent hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 group-hover:border-gray-300'
                    }`}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate transition-colors ${
                        isSelected ? 'text-brand-800' : 'text-gray-800'
                      }`}>
                        {emp.full_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {emp.email}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium capitalize inline-block ${
                          emp.role === 'admin' ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-500'
                        }`}>{emp.role}</span>
                      </p>
                    </div>

                    {/* Toggle */}
                    <div className={`flex items-center gap-1.5 flex-shrink-0 transition-all ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                    }`}>
                      {isSelected ? (
                        <span className="flex items-center gap-1.5 text-xs text-brand-700 font-semibold bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl">
                          <Eye className="w-3.5 h-3.5" />Can view
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
                          + Add
                        </span>
                      )}
                    </div>

                    {/* Checkbox indicator */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-brand-600 border-brand-600' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex-shrink-0">
          {/* Status message */}
          <div className={`flex items-center gap-2 mb-3 text-xs px-3 py-2 rounded-xl ${
            dirty
              ? 'bg-amber-50 border border-amber-200 text-amber-700'
              : selectedCount > 0
                ? 'bg-brand-50 border border-brand-200 text-brand-700'
                : 'bg-gray-100 border border-gray-200 text-gray-500'
          }`}>
            {dirty
              ? <><span className="text-amber-500">⚠</span> Unsaved changes — click Save to apply</>
              : selectedCount > 0
                ? <><CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />{selectedCount} teammate{selectedCount !== 1 ? 's' : ''} can view this notebook</>
                : <><Lock className="w-3.5 h-3.5" />Notebook is private — only you can see it</>
            }
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !dirty}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Access'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Add Section Modal ───────────────────────────────────── */
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

/* ─── Section Form Modal ──────────────────────────────────── */
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
  const { setActiveNotebook, setNotebookSwitching } = useApp()

  useEffect(() => {
    if (expanded) fetchSections(nb.id)
  }, [expanded, nb.id])

  const handleSelectSection = (s) => {
    setNotebookSwitching(false)
    setActiveNotebook(nb)
    onSelectSection(s)
  }

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
        <div className="flex-1 min-w-0">
          <span className="block text-sm truncate font-medium text-gray-600">{nb.title}</span>
          {nb.owner_name && (
            <span className="block text-xs text-purple-400 truncate">by {nb.owner_name}</span>
          )}
        </div>
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
                    onClick={(e) => { e.stopPropagation(); handleSelectSection(s) }}
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

