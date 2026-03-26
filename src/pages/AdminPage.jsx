import { useEffect, useState, useCallback } from 'react'
import { useUsers, useFolders } from '../hooks/useFolders'
import { useNotebooks, usePages } from '../hooks/useNotebooks'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { ConfirmModal } from '../components/ui/Toast'
import { Avatar } from '../components/layout/Sidebar'
import NoteEditor from '../components/notebook/NoteEditor'
import { dbQuery } from '../lib/neon'
import {
  Shield, Users, BookOpen, Trash2, Mail,
  Crown, User, Search, MessageSquare,
  Send, X, Loader2, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Folder, FolderOpen,
  Image as ImageIcon, Eye, Grid3x3, List, MapPin,
  FileText, Hash, Building2, Upload, Plus
} from 'lucide-react'
import { formatDate, formatRelative } from '../lib/utils'

/* ─────────────────────────────────────────────────────────── */
/*  MAIN ADMIN PAGE                                            */
/* ─────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const { profile, isAdmin } = useAuth()
  const { showToast } = useApp()
  const { users, loading: loadingUsers, fetchUsers, updateUser, deleteUser } = useUsers()
  const { notebooks, fetchAllNotebooks } = useNotebooks()
  const { pages, fetchPages, updatePage, deletePage, fetchComments, addComment, deleteComment } = usePages()
  const { folders, fetchFolders, fetchImages } = useFolders()

  const [activeTab, setActiveTab]             = useState('users')
  const [selectedUser, setSelectedUser]       = useState(null)
  const [selectedNotebook, setSelectedNotebook] = useState(null)
  const [sections, setSections]               = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedPage, setSelectedPage]       = useState(null)
  const [comments, setComments]               = useState([])
  const [commentText, setCommentText]         = useState('')
  const [search, setSearch]                   = useState('')
  const [roleFilter, setRoleFilter]           = useState('all')
  const [deleteUserId, setDeleteUserId]       = useState(null)
  const [deletePageId, setDeletePageId]       = useState(null)
  const [loadingComments, setLoadingComments] = useState(false)
  // Accordion expansion state { notebookId: bool }
  const [nbExpanded, setNbExpanded]           = useState({})
  const [nbSections, setNbSections]           = useState({}) // { notebookId: [] }
  const [loadingSections, setLoadingSections] = useState({})

  useEffect(() => { fetchUsers(); fetchAllNotebooks(); fetchFolders() }, [])

  useEffect(() => {
    if (selectedSection) fetchPages(selectedSection.id)
  }, [selectedSection?.id])

  useEffect(() => {
    if (!selectedPage) return
    setLoadingComments(true)
    fetchComments(selectedPage.id)
      .then(setComments).catch(console.error).finally(() => setLoadingComments(false))
  }, [selectedPage?.id])

  const toggleNotebook = async (nb) => {
    const isOpen = !!nbExpanded[nb.id]
    setNbExpanded(prev => ({ ...prev, [nb.id]: !isOpen }))
    if (!isOpen && !nbSections[nb.id]) {
      setLoadingSections(prev => ({ ...prev, [nb.id]: true }))
      try {
        const rows = await dbQuery(
          'SELECT * FROM mf_sections WHERE notebook_id = $1 ORDER BY sort_order, created_at',
          [nb.id]
        )
        setNbSections(prev => ({ ...prev, [nb.id]: rows }))
      } finally {
        setLoadingSections(prev => ({ ...prev, [nb.id]: false }))
      }
    }
    setSelectedNotebook(nb)
    setSelectedSection(null)
    setSelectedPage(null)
  }

  const handleSendComment = useCallback(async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !selectedPage || !profile) return
    try {
      await addComment(selectedPage.id, profile.id, commentText)
      setCommentText('')
      const rows = await fetchComments(selectedPage.id)
      setComments(rows)
      showToast('Comment posted')
    } catch (err) { showToast(err.message, 'error') }
  }, [commentText, selectedPage, profile])

  const handleDeletePage = async () => {
    await deletePage(deletePageId)
    if (selectedPage?.id === deletePageId) setSelectedPage(null)
    showToast('Page deleted')
  }

  const handleDeleteUser = async () => {
    await deleteUser(deleteUserId)
    if (selectedUser?.id === deleteUserId) setSelectedUser(null)
    showToast('User removed')
  }

  const handleRoleChange = async (userId, role) => {
    await updateUser(userId, { role })
    showToast(`Role updated to ${role}`)
  }

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-slate-800 font-semibold text-lg mb-1">Access Denied</h2>
      <p className="text-slate-400 text-sm">You need admin privileges to access this area.</p>
    </div>
  )

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (roleFilter === 'all' || u.role === roleFilter)
  })

  const tabs = [
    { id: 'users',     label: 'Users',      icon: Users,    count: users.length },
    { id: 'notebooks', label: 'All Notes',  icon: BookOpen, count: notebooks.length },
    { id: 'folders',   label: 'Site Files', icon: Folder,   count: folders.length },
  ]

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* ── LEFT SIDEBAR ───────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">

        {/* Admin header */}
        <div className="px-4 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Admin Panel</h2>
              <p className="text-xs text-gray-400">System oversight</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => { setActiveTab(id); setSelectedUser(null); setSelectedNotebook(null); setSelectedSection(null); setSelectedPage(null) }}
                className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}>
                <Icon className="w-3.5 h-3.5 mb-0.5" />
                <span className="leading-none">{label}</span>
                <span className={`mt-0.5 rounded-full px-1.5 text-xs ${activeTab === id ? 'bg-brand-100 text-brand-600' : 'text-gray-400'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── USERS LIST ── */}
        {activeTab === 'users' && (
          <>
            <div className="px-3 py-2 border-b border-gray-200 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…"
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-brand-400" />
              </div>
              <div className="flex gap-1">
                {['all', 'admin', 'employee'].map((r) => (
                  <button key={r} onClick={() => setRoleFilter(r)}
                    className={`flex-1 py-1 text-xs rounded-lg transition-colors capitalize ${
                      roleFilter === r ? 'bg-purple-100 text-purple-600 border border-purple-200' : 'bg-gray-100 text-gray-400 hover:text-gray-700'
                    }`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingUsers
                ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)
                : filteredUsers.map((u) => (
                    <UserListItem key={u.id} user={u} active={selectedUser?.id === u.id}
                      onClick={() => setSelectedUser(u)} onRoleChange={handleRoleChange} onDelete={() => setDeleteUserId(u.id)} />
                  ))
              }
            </div>
          </>
        )}

        {/* ── NOTEBOOKS ACCORDION TREE ── */}
        {activeTab === 'notebooks' && (
          <div className="flex-1 overflow-y-auto py-1.5">
            {notebooks.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400">
                <BookOpen className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">No notebooks yet</p>
              </div>
            ) : (
              notebooks.map((nb) => (
                <AdminNotebookRow
                  key={nb.id}
                  nb={nb}
                  expanded={!!nbExpanded[nb.id]}
                  sections={nbSections[nb.id] || []}
                  loadingSections={!!loadingSections[nb.id]}
                  selectedSection={selectedSection}
                  selectedPage={selectedPage}
                  pages={pages}
                  onToggle={() => toggleNotebook(nb)}
                  onSelectSection={(s) => { setSelectedSection(s); setSelectedPage(null) }}
                  onSelectPage={setSelectedPage}
                  onDeletePage={(id) => setDeletePageId(id)}
                />
              ))
            )}
          </div>
        )}

        {/* ── FOLDERS LIST ── */}
        {activeTab === 'folders' && (
          <AdminFoldersSidebar
            folders={folders}
            onSelectFolder={(f) => { setSelectedUser(null); setSelectedNotebook(f) }}
            selectedFolder={selectedNotebook}
          />
        )}
      </div>

      {/* ── MAIN CONTENT AREA ─────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {activeTab === 'users' && selectedUser ? (
          <UserDetail user={selectedUser} notebooks={notebooks.filter((n) => n.user_id === selectedUser.id)}
            onRoleChange={handleRoleChange} onDelete={() => setDeleteUserId(selectedUser.id)} />
        ) : activeTab === 'notebooks' && selectedPage ? (
          <AdminPageView
            page={selectedPage} comments={comments} commentText={commentText}
            setCommentText={setCommentText} onSendComment={handleSendComment}
            loadingComments={loadingComments}
            onDeleteComment={async (id) => { await deleteComment(id); setComments((prev) => prev.filter((c) => c.id !== id)); showToast('Comment deleted') }}
            onUpdatePage={async (content) => { await updatePage(selectedPage.id, { content }); showToast('Page saved') }}
          />
        ) : activeTab === 'folders' && selectedNotebook ? (
          <AdminFolderViewer folder={selectedNotebook} fetchImages={fetchImages} />
        ) : (
          <DashboardWelcome users={users} notebooks={notebooks} folders={folders} />
        )}
      </div>

      <ConfirmModal open={!!deleteUserId} onClose={() => setDeleteUserId(null)} onConfirm={handleDeleteUser}
        title="Remove User" message="This will permanently delete the user and all their data." danger />
      <ConfirmModal open={!!deletePageId} onClose={() => setDeletePageId(null)} onConfirm={handleDeletePage}
        title="Delete Page" message="This page will be permanently removed." danger />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  ADMIN NOTEBOOK ACCORDION ROW                              */
/* ─────────────────────────────────────────────────────────── */
function AdminNotebookRow({ nb, expanded, sections, loadingSections, selectedSection, selectedPage, pages, onToggle, onSelectSection, onSelectPage, onDeletePage }) {
  const [sectionPages, setSectionPages] = useState({})
  const [sectionPagesMap, setSectionPagesMap] = useState({})
  const [loadingPages, setLoadingPages] = useState({})

  const toggleSection = async (s) => {
    const isOpen = !!sectionPages[s.id]
    setSectionPages(prev => ({ ...prev, [s.id]: !isOpen }))
    onSelectSection(s)
    if (!isOpen && !sectionPagesMap[s.id]) {
      setLoadingPages(prev => ({ ...prev, [s.id]: true }))
      try {
        const ps = await dbQuery(
          'SELECT * FROM mf_pages WHERE section_id = $1 ORDER BY is_pinned DESC, sort_order, created_at',
          [s.id]
        )
        setSectionPagesMap(prev => ({ ...prev, [s.id]: ps }))
      } finally {
        setLoadingPages(prev => ({ ...prev, [s.id]: false }))
      }
    }
  }

  return (
    <div className="select-none">
      {/* Notebook row */}
      <div
        onClick={onToggle}
        className={`group flex items-center gap-1.5 px-3 py-2 cursor-pointer rounded-xl mx-1.5 mb-0.5 transition-all border ${
          expanded ? 'bg-brand-50 border-brand-200' : 'hover:bg-gray-100 border-transparent'
        }`}
      >
        <span className="text-gray-400 flex-shrink-0 w-4 flex items-center justify-center">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: nb.color }} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate font-medium ${expanded ? 'text-gray-900' : 'text-gray-600'}`}>{nb.title}</p>
          <p className="text-xs text-gray-400 truncate">{nb.owner_name}</p>
        </div>
      </div>

      {/* Sections */}
      {expanded && (
        <div className="ml-5 mr-1.5 mb-1">
          {loadingSections ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Loading sections…</span>
            </div>
          ) : sections.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2 italic">No sections</p>
          ) : (
            sections.map((s) => (
              <div key={s.id}>
                {/* Section row */}
                <div
                  onClick={() => toggleSection(s)}
                  className={`group/sec flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all mb-0.5 border ${
                    selectedSection?.id === s.id ? 'bg-white border-gray-200 shadow-sm' : 'hover:bg-white/70 border-transparent'
                  }`}
                >
                  <span className="text-gray-400 flex-shrink-0 w-3 flex items-center justify-center">
                    {sectionPages[s.id] ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                  </span>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className={`flex-1 text-xs truncate font-medium ${selectedSection?.id === s.id ? 'text-gray-900' : 'text-gray-500'}`}>{s.title}</span>
                </div>

                {/* Pages under section */}
                {sectionPages[s.id] && (
                  <div className="ml-5 mb-1">
                    {loadingPages[s.id] ? (
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-300" />
                        <span className="text-xs text-gray-400">Loading pages…</span>
                      </div>
                    ) : (sectionPagesMap[s.id] || []).length === 0 ? (
                      <p className="text-xs text-gray-400 px-2 py-1.5 italic">No pages</p>
                    ) : (
                      (sectionPagesMap[s.id] || []).map((p) => (
                        <div
                          key={p.id}
                          onClick={(e) => { e.stopPropagation(); onSelectPage(p) }}
                          className={`group/pg flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all mb-0.5 border ${
                            selectedPage?.id === p.id ? 'bg-brand-50 border-brand-200 text-brand-700' : 'hover:bg-gray-50 border-transparent text-gray-500'
                          }`}
                        >
                          <FileText className="w-3 h-3 flex-shrink-0 opacity-60" />
                          <span className="flex-1 text-xs truncate">{p.title || 'Untitled'}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePage(p.id) }}
                            className="opacity-0 group-hover/pg:opacity-100 p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  ADMIN FOLDERS SIDEBAR                                      */
/* ─────────────────────────────────────────────────────────── */
function AdminFoldersSidebar({ folders, onSelectFolder, selectedFolder }) {
  const [search, setSearch] = useState('')
  const filtered = folders.filter(f =>
    f.site_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search folders…"
            className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-brand-400" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <Folder className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No site folders</p>
          </div>
        ) : (
          filtered.map((f) => (
            <div
              key={f.id}
              onClick={() => onSelectFolder(f)}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
                selectedFolder?.id === f.id ? 'bg-brand-50 border-brand-200' : 'hover:bg-gray-100 border-transparent'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selectedFolder?.id === f.id ? 'bg-brand-100' : 'bg-gray-100'
              }`}>
                {selectedFolder?.id === f.id
                  ? <FolderOpen className="w-4 h-4 text-brand-600" />
                  : <Folder className="w-4 h-4 text-gray-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{f.site_name}</p>
                <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{f.location}
                </p>
                {f.owner_name && <p className="text-xs text-gray-400 truncate">by {f.owner_name}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  ADMIN FOLDER VIEWER (right pane)                           */
/* ─────────────────────────────────────────────────────────── */
function AdminFolderViewer({ folder, fetchImages }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!folder) return
    setLoading(true)
    fetchImages(folder.id).then(setImages).finally(() => setLoading(false))
  }, [folder?.id])

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="w-5 h-5 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-800 truncate">{folder.site_name}</h2>
          <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3" />{folder.location}
            {folder.owner_name && <><span className="text-gray-300">·</span> <span>Uploaded by {folder.owner_name}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-700'}`}>
            <Grid3x3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-700'}`}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-6 text-xs text-gray-500 flex-shrink-0">
        <span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" />{images.length} image{images.length !== 1 ? 's' : ''}</span>
        {folder.description && <span className="truncate opacity-70">{folder.description}</span>}
      </div>

      {/* Images */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-3'}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 rounded-xl animate-pulse ${viewMode === 'grid' ? 'aspect-square' : 'h-16'}`} />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No images uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">Images uploaded to this folder will appear here</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img) => (
              <div key={img.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer border border-gray-200 hover:border-brand-300 transition-all shadow-sm hover:shadow-md"
                onClick={() => setLightbox(img)}>
                <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs truncate">{img.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {images.map((img) => (
              <div key={img.id}
                className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-xl hover:border-brand-300 transition-colors cursor-pointer"
                onClick={() => setLightbox(img)}>
                <div className="w-14 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{img.file_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {img.file_size && <span className="text-xs text-gray-400">{(img.file_size / 1024).toFixed(0)} KB</span>}
                    <span className="text-xs text-gray-400">{formatDate(img.created_at)}</span>
                    {img.uploader_name && <span className="text-xs text-gray-400">by {img.uploader_name}</span>}
                  </div>
                  {img.caption && <p className="text-xs text-gray-400 mt-0.5 truncate">{img.caption}</p>}
                </div>
                <Eye className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 animate-fade-in"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.file_name}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl" />
            <div className="text-center">
              <p className="text-white font-medium">{lightbox.file_name}</p>
              {lightbox.caption && <p className="text-white/60 text-sm mt-1">{lightbox.caption}</p>}
              {lightbox.uploader_name && <p className="text-white/40 text-xs mt-1">Uploaded by {lightbox.uploader_name}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────── */

function UserListItem({ user, active, onClick, onRoleChange, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div onClick={onClick} className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
      active ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-100 border-transparent'
    }`}>
      <Avatar name={user.full_name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{user.full_name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
        }`}>{user.role}</span>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 4 16">
              <circle cx="2" cy="2" r="2"/><circle cx="2" cy="8" r="2"/><circle cx="2" cy="14" r="2"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden animate-scale-in">
              {user.role === 'employee'
                ? <button onClick={() => { onRoleChange(user.id, 'admin'); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 transition-colors">
                    <Crown className="w-3 h-3" /> Promote to Admin
                  </button>
                : <button onClick={() => { onRoleChange(user.id, 'employee'); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                    <User className="w-3 h-3" /> Set as Employee
                  </button>
              }
              <button onClick={() => { onDelete(); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3 h-3" /> Remove User
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UserDetail({ user, notebooks, onRoleChange, onDelete }) {
  return (
    <div className="p-6 overflow-y-auto h-full animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <Avatar name={user.full_name} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 truncate">{user.full_name}</h2>
            <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-0.5 truncate">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />{user.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-brand-50 text-brand-600 border-brand-200'
              }`}>{user.role}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {user.is_active ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {user.role === 'employee'
            ? <button onClick={() => onRoleChange(user.id, 'admin')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-600 border border-purple-200 transition-colors">
                <Crown className="w-3 h-3" /> Promote to Admin
              </button>
            : <button onClick={() => onRoleChange(user.id, 'employee')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-colors">
                <User className="w-3 h-3" /> Set as Employee
              </button>
          }
          <button onClick={onDelete}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors">
            <Trash2 className="w-3 h-3" /> Remove User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Notebooks" value={notebooks.length} color="brand" />
        <StatCard label="Since" value={new Date(user.created_at).toLocaleDateString('en', { month:'short', year:'numeric' })} color="emerald" />
        <StatCard label="Role" value={user.role} color={user.role === 'admin' ? 'purple' : 'slate'} />
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-brand-600" />Notebooks ({notebooks.length})
      </h3>
      <div className="space-y-2">
        {notebooks.length === 0
          ? <p className="text-center py-6 text-gray-400 text-sm">No notebooks yet</p>
          : notebooks.map((nb) => (
              <div key={nb.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: nb.color + '20', border: `1px solid ${nb.color}30` }}>{nb.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{nb.title}</p>
                  <p className="text-xs text-gray-400">{formatDate(nb.updated_at)}</p>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}

function AdminPageView({ page, comments, commentText, setCommentText, onSendComment, loadingComments, onDeleteComment, onUpdatePage }) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-800 truncate">{page.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(page.updated_at)}</p>
          </div>
          <span className="flex-shrink-0 text-xs bg-purple-100 text-purple-600 border border-purple-200 px-2.5 py-1 rounded-full font-medium">
            Admin View
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <NoteEditor content={page.content} onChange={onUpdatePage} />
        </div>
      </div>

      <div className="w-80 flex-shrink-0 flex flex-col bg-white">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-800">Comments</h3>
          {comments.length > 0 && (
            <span className="ml-auto bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full border border-purple-200">{comments.length}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loadingComments
            ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
            : comments.length === 0
              ? <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">No comments yet</p>
                </div>
              : comments.map((c) => (
                  <div key={c.id} className="group bg-gray-50 border border-gray-200 rounded-xl p-3 relative animate-fade-in">
                    <div className="flex items-start gap-2 mb-2">
                      <Avatar name={c.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-gray-800 truncate">{c.full_name}</p>
                          {c.commenter_role === 'admin' && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0 rounded-full font-medium border border-purple-200">Admin</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{formatRelative(c.created_at)}</p>
                      </div>
                      <button onClick={() => onDeleteComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{c.comment}</p>
                  </div>
                ))
          }
        </div>
        <div className="p-3 border-t border-gray-200">
          <form onSubmit={onSendComment} className="space-y-2">
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) onSendComment(e) }}
              rows={3} placeholder="Feedback for this employee… (Ctrl+Enter)"
              className="w-full bg-gray-50 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none resize-none transition-colors" />
            <button type="submit" disabled={!commentText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
              <Send className="w-3.5 h-3.5" />Post Comment
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function DashboardWelcome({ users, notebooks, folders }) {
  const adminCount    = users.filter((u) => u.role === 'admin').length
  const employeeCount = users.filter((u) => u.role === 'employee').length
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center mb-5">
        <Shield className="w-7 h-7 text-purple-600" />
      </div>
      <h3 className="text-gray-800 font-bold text-lg mb-1">Admin Control Center</h3>
      <p className="text-gray-400 text-sm mb-8 max-w-xs">Manage users, review notebooks, view site folders, and leave comments on employee pages.</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        <BigStat label="Total Users"  value={users.length}     color="brand"   icon={<Users className="w-5 h-5"/>} />
        <BigStat label="Notebooks"    value={notebooks.length} color="emerald" icon={<BookOpen className="w-5 h-5"/>} />
        <BigStat label="Admins"       value={adminCount}       color="purple"  icon={<Crown className="w-5 h-5"/>} />
        <BigStat label="Site Folders" value={folders.length}   color="slate"   icon={<Folder className="w-5 h-5"/>} />
      </div>
    </div>
  )
}

const COLOR = {
  brand:   { bg: 'bg-brand-50',      text: 'text-brand-600',   border: 'border-brand-200' },
  emerald: { bg: 'bg-emerald-50',    text: 'text-emerald-600', border: 'border-emerald-200' },
  purple:  { bg: 'bg-purple-50',     text: 'text-purple-600',  border: 'border-purple-200' },
  slate:   { bg: 'bg-gray-100',      text: 'text-gray-600',    border: 'border-gray-200' },
}
function BigStat({ label, value, color, icon }) {
  const c = COLOR[color] || COLOR.slate
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 text-left`}>
      <div className={`${c.text} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
function StatCard({ label, value, color }) {
  const c = COLOR[color] || COLOR.slate
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3`}>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
