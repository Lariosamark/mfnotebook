import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { BookOpen, FolderOpen, Shield, LogOut, X, Search } from 'lucide-react'
import NotebookList from '../notebook/NotebookList'
import FolderList from './FolderList'
import AdminNav from './AdminNav'
import { Modal } from '../ui/Toast'
import { useFolders } from '../../hooks/useFolders'
import { MapPin } from 'lucide-react'

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const NAV = [
  { id: 'notebooks', label: 'Notebooks',   icon: BookOpen },
  { id: 'folders',   label: 'Folders',     icon: FolderOpen },
]

export default function Sidebar({ onNavigate, onSelectSection }) {
  const { profile, signOut, isAdmin } = useAuth()
  const { sidebarOpen, setSidebarOpen, activeView, setActiveSection, setActivePage, setIsSharedNotebook } = useApp()
  const [userMenu, setUserMenu]         = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [editFolder, setEditFolder]     = useState(null)

  const [sidebarWidth, setSidebarWidth] = useState(280)
  const dragging = useRef(false)
  const startX   = useRef(0)
  const startW   = useRef(0)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = sidebarWidth
    const onMove = (e) => {
      if (!dragging.current) return
      setSidebarWidth(Math.min(400, Math.max(220, startW.current + (e.clientX - startX.current))))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const navItems = isAdmin
    ? [...NAV, { id: 'admin', label: 'Admin', icon: Shield }]
    : NAV

  const handleSelectSection = (s, isShared = false) => {
    setActiveSection(s)
    setActivePage(null)
    setIsSharedNotebook(isShared)
    if (onSelectSection) onSelectSection(s, isShared)
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`
          fixed lg:relative z-30 h-full app-sidebar flex flex-shrink-0
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ width: sidebarWidth }}
      >
        <div className="flex flex-col h-full w-full overflow-hidden relative">

          {/* ── Logo row ── */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-white text-sm leading-tight tracking-tight">MFNotebook</p>
                <p className="text-green-300 text-[10px] opacity-70">Workspace</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)}
              className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors lg:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Nav tabs ── */}
          <div className="flex items-center gap-1 px-2 pb-2 flex-shrink-0">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeView === id
              return (
                <button key={id} onClick={() => onNavigate(id)} title={label}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
                    active ? 'bg-white/20 text-white shadow-sm' : 'text-white/55 hover:bg-white/10 hover:text-white'
                  }`}>
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-green-300' : ''}`} />
                  <span className="truncate">{label}</span>
                  {active && <span className="w-1 h-1 rounded-full bg-green-300 flex-shrink-0 animate-pulse" />}
                </button>
              )
            })}
          </div>

          {/* ── Search bar (notebooks only) ── */}
          {activeView === 'notebooks' && (
            <div className="px-2 pb-2 flex-shrink-0">
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-left">
                <Search className="w-3 h-3 text-white/50 flex-shrink-0" />
                <span className="text-xs text-white/40 font-medium flex-1">Search notes…</span>
                <kbd className="text-[10px] text-white/25 font-mono">⌘K</kbd>
              </button>
            </div>
          )}

          {/* ── Content panel ── */}
          <div className="flex-1 overflow-hidden mx-2 mb-2 rounded-xl bg-white border border-white/10 shadow-sm">
            {activeView === 'notebooks' && <NotebookList onSelectSection={handleSelectSection} />}
            {activeView === 'folders'   && (
              <FolderList
                onCreateOpen={() => setCreateFolderOpen(true)}
                onEditFolder={f => setEditFolder(f)}
              />
            )}
            {activeView === 'admin' && <AdminNav />}
          </div>

          {/* ── User footer ── */}
          <div className="flex-shrink-0 px-2 pb-2">
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors">
                <Avatar name={profile?.full_name} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'User'}</p>
                  <p className="text-[10px] text-green-300/60 capitalize">{profile?.role || 'employee'}</p>
                </div>
              </button>
              {userMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lifted overflow-hidden animate-scale-in z-10">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  </div>
                  <button onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resize handle */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group"
          onMouseDown={onMouseDown}>
          <div className="h-full w-full bg-transparent group-hover:bg-white/20 transition-colors" />
        </div>
      </aside>

      {/* Folder modals */}
      <FolderFormModal open={createFolderOpen} onClose={() => setCreateFolderOpen(false)} />
      {editFolder && <FolderFormModal open onClose={() => setEditFolder(null)} initialData={editFolder} />}
    </>
  )
}

/* ── Folder Form Modal ── */
function FolderFormModal({ open, onClose, initialData }) {
  const { createFolder, updateFolder, fetchFolders } = useFolders()
  const { setActiveFolder, showToast } = useApp()
  const [form, setForm] = useState({
    siteName: initialData?.site_name || '',
    location: initialData?.location || '',
    description: initialData?.description || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.siteName.trim() || !form.location.trim()) return
    setSaving(true)
    try {
      if (initialData) {
        await updateFolder(initialData.id, form)
        showToast('Folder updated')
      } else {
        const f = await createFolder(form)
        setActiveFolder(f)
        showToast('Site folder created')
      }
      await fetchFolders()
      onClose()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Site Folder' : 'New Site Folder'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Site Name *</label>
          <input value={form.siteName} onChange={e => setForm({ ...form, siteName: e.target.value })}
            className="w-full bg-slate-100 border border-slate-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none"
            placeholder="e.g., North Tower Construction" autoFocus />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Location *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full bg-slate-100 border border-slate-200 focus:border-brand-400 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none"
              placeholder="e.g., 123 Main St, City" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full bg-slate-100 border border-slate-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none resize-none"
            placeholder="Optional notes about this site…" />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">Cancel</button>
          <button type="submit" disabled={!form.siteName.trim() || !form.location.trim() || saving}
            className="px-4 py-2 text-sm rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : initialData ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function Avatar({ name, size = 'md' }) {
  const initials = getInitials(name)
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs'
  const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-green-600', 'bg-lime-600', 'bg-cyan-500', 'bg-green-500']
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`${s} ${color} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 text-xs shadow-sm`}>
      {initials}
    </div>
  )
}
