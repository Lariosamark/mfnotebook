import { useEffect, useState } from 'react'
import { useFolders } from '../../hooks/useFolders'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { ConfirmModal } from '../ui/Toast'
import {
  Folder, Plus, Search, Building2, MapPin,
  Pencil, Trash2
} from 'lucide-react'

export default function FolderList({ onCreateOpen, onEditFolder }) {
  const { folders, loading, fetchFolders, deleteFolder } = useFolders()
  const { isAdmin } = useAuth()
  const { activeFolder, setActiveFolder, showToast } = useApp()

  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { fetchFolders() }, [])

  const handleDelete = async () => {
    await deleteFolder(deleteId)
    if (activeFolder?.id === deleteId) setActiveFolder(null)
    setDeleteId(null)
    showToast('Folder deleted')
  }

  const filtered = folders.filter(f =>
    f.site_name.toLowerCase().includes(search.toLowerCase()) ||
    f.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-brand-600" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Site Folders</span>
          <span className="text-[10px] bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">{folders.length}</span>
        </div>
        <button
          onClick={onCreateOpen}
          className="w-5 h-5 flex items-center justify-center rounded-md bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search folders…"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 outline-none focus:border-brand-400 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Building2 className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">No folders found</p>
            <button onClick={onCreateOpen} className="text-brand-600 text-xs mt-1.5 hover:underline">
              Create one
            </button>
          </div>
        ) : (
          filtered.map(f => (
            <FolderItem
              key={f.id}
              folder={f}
              active={activeFolder?.id === f.id}
              onClick={() => setActiveFolder(f)}
              onEdit={() => onEditFolder(f)}
              onDelete={() => setDeleteId(f.id)}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Folder"
        message="This will delete the folder and all its images permanently."
        danger
      />
    </div>
  )
}

function FolderItem({ folder, active, onClick, onEdit, onDelete, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
        active
          ? 'bg-brand-600/10 border border-brand-200'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-brand-600/10 border border-brand-100 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{folder.site_name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
          <p className="text-[10px] text-gray-400 truncate">{folder.location}</p>
        </div>
      </div>
      <div
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 w-28 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            <button
              onClick={() => { onEdit(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {isAdmin && (
              <button
                onClick={() => { onDelete(); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
