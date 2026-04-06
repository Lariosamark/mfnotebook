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
  Shield, Users, Trash2, Mail,
  Crown, User, MessageSquare,
  Send, X, Loader2, AlertTriangle,
  ChevronDown, ChevronRight, Folder, FolderOpen,
  Image as ImageIcon, Eye, Grid3x3, List, MapPin,
  FileText, BookOpen, LayoutDashboard, TrendingUp, Clock
} from 'lucide-react'
import { formatDate, formatRelative } from '../lib/utils'

export default function AdminPage() {
  const { profile, isAdmin } = useAuth()
  const { showToast, activeAdminTab, setActiveAdminTab, adminSelectedUser, setAdminSelectedUser, setSidebarOpen } = useApp()
  const { users, loading: loadingUsers, fetchUsers, updateUser, deleteUser } = useUsers()
  const { notebooks, loading: loadingNotebooks, fetchAllNotebooks } = useNotebooks()
  const { pages, fetchPages, updatePage, deletePage, fetchComments, addComment, deleteComment } = usePages()
  const { folders, loading: loadingFolders, fetchFolders, fetchImages } = useFolders()

  const [userDetailTab, setUserDetailTab]   = useState('notebooks')
  const [selectedPage, setSelectedPage]     = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [comments, setComments]             = useState([])
  const [commentText, setCommentText]       = useState('')
  const [deleteUserId, setDeleteUserId]     = useState(null)
  const [deletePageId, setDeletePageId]     = useState(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [nbExpanded, setNbExpanded]         = useState({})
  const [nbSections, setNbSections]         = useState({})
  const [loadingSections, setLoadingSections] = useState({})

  useEffect(() => {
    if (profile) { fetchUsers(); fetchAllNotebooks(); fetchFolders() }
  }, [profile?.id])

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
        const rows = await dbQuery('SELECT * FROM mf_sections WHERE notebook_id = $1 ORDER BY sort_order, created_at', [nb.id])
        setNbSections(prev => ({ ...prev, [nb.id]: rows }))
      } finally {
        setLoadingSections(prev => ({ ...prev, [nb.id]: false }))
      }
    }
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
    if (adminSelectedUser?.id === deleteUserId) setAdminSelectedUser(null)
    showToast('User removed')
    await fetchUsers()
  }

  const handleRoleChange = async (userId, role) => {
    await updateUser(userId, { role })
    showToast(`Role updated to ${role}`)
    await fetchUsers()
  }

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-slate-800 font-semibold text-lg mb-1">Access Denied</h2>
      <p className="text-slate-400 text-sm">You need admin privileges to access this area.</p>
    </div>
  )

  const userNotebooks = adminSelectedUser ? notebooks.filter(n => n.user_id === adminSelectedUser.id) : []
  const userFolders   = adminSelectedUser ? folders.filter(f => f.user_id === adminSelectedUser.id) : []

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f7f8fc]">

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-xl transition-colors">
          <Shield className="w-3.5 h-3.5" /> Admin
        </button>
        {adminSelectedUser && (
          <span className="text-xs text-gray-500 truncate">{adminSelectedUser.full_name}</span>
        )}
      </div>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {activeAdminTab === 'overview' && (
          <OverviewPanel users={users} notebooks={notebooks} folders={folders}
            loading={loadingUsers || loadingNotebooks || loadingFolders}
            onSelectUser={u => { setAdminSelectedUser(u); setActiveAdminTab('users') }} />
        )}
        {activeAdminTab === 'users' && !adminSelectedUser && (
          <EmptyState icon={<Users className="w-8 h-8 text-gray-300"/>}
            title="Select a user" sub="Click any user in the sidebar to view their content" />
        )}
        {activeAdminTab === 'users' && adminSelectedUser && !selectedPage && !selectedFolder && (
          <UserDetailPanel
            user={adminSelectedUser} notebooks={userNotebooks} folders={userFolders}
            tab={userDetailTab} onTabChange={setUserDetailTab}
            onSelectPage={p => { setSelectedPage(p); setSelectedFolder(null) }}
            onSelectFolder={f => { setSelectedFolder(f); setSelectedPage(null) }}
            onRoleChange={handleRoleChange} onDelete={() => setDeleteUserId(adminSelectedUser.id)}
            nbExpanded={nbExpanded} nbSections={nbSections} loadingSections={loadingSections}
            onToggleNotebook={toggleNotebook}
          />
        )}
        {selectedPage && (
          <AdminPageView
            page={selectedPage} comments={comments} commentText={commentText}
            setCommentText={setCommentText} onSendComment={handleSendComment}
            loadingComments={loadingComments} onBack={() => setSelectedPage(null)}
            onDeleteComment={async id => { await deleteComment(id); setComments(prev => prev.filter(c => c.id !== id)); showToast('Comment deleted') }}
            onUpdatePage={async content => { await updatePage(selectedPage.id, { content }); showToast('Page saved') }}
            onDeletePage={() => setDeletePageId(selectedPage.id)}
          />
        )}
        {selectedFolder && !selectedPage && (
          <AdminFolderViewer folder={selectedFolder} fetchImages={fetchImages} onBack={() => setSelectedFolder(null)} />
        )}
      </main>

      <ConfirmModal open={!!deleteUserId} onClose={() => setDeleteUserId(null)} onConfirm={handleDeleteUser}
        title="Remove User" message="This will permanently delete the user and all their data." danger />
      <ConfirmModal open={!!deletePageId} onClose={() => setDeletePageId(null)} onConfirm={handleDeletePage}
        title="Delete Page" message="This page will be permanently removed." danger />
    </div>
  )
}

/* ── OVERVIEW ── */
function OverviewPanel({ users, notebooks, folders, loading, onSelectUser }) {
  const admins    = users.filter(u => u.role === 'admin')
  const employees = users.filter(u => u.role === 'employee')
  const recentUsers = [...users].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,5)

  const StatSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="w-8 h-8 bg-gray-200 rounded-xl mb-3" />
      <div className="h-7 w-12 bg-gray-200 rounded mb-1" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </div>
  )

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">System overview and quick access</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <BigStatCard icon={<Users className="w-5 h-5"/>}    label="Total Users"  value={users.length}     color="violet" />
              <BigStatCard icon={<BookOpen className="w-5 h-5"/>} label="Notebooks"    value={notebooks.length} color="blue" />
              <BigStatCard icon={<Folder className="w-5 h-5"/>}   label="Site Folders" value={folders.length}   color="amber" />
              <BigStatCard icon={<Crown className="w-5 h-5"/>}    label="Admins"       value={admins.length}    color="purple" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recent Users */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" /> Recent Users
              </h3>
              <span className="text-xs text-gray-400">{loading ? '…' : `${users.length} total`}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-32 mb-1.5" />
                      <div className="h-2.5 bg-gray-100 rounded w-48" />
                    </div>
                    <div className="h-4 w-14 bg-gray-100 rounded-full" />
                  </div>
                ))
              ) : recentUsers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No users yet</p>
              ) : (
                recentUsers.map(u => (
                  <div key={u.id} onClick={() => onSelectUser(u)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Avatar name={u.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
                    }`}>{u.role}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Content by Employee */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Content by Employee
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-28 mb-1.5" />
                      <div className="h-2 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full" />
                  </div>
                ))
              ) : employees.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No employees yet</p>
              ) : (
                employees.slice(0,5).map(emp => {
                  const nb = notebooks.filter(n => n.user_id === emp.id).length
                  const fl = folders.filter(f => f.user_id === emp.id).length
                  const maxNb = Math.max(1, ...employees.map(e => notebooks.filter(n => n.user_id === e.id).length))
                  return (
                    <div key={emp.id} onClick={() => onSelectUser(emp)}
                      className="flex items-center gap-3 cursor-pointer group">
                      <Avatar name={emp.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate group-hover:text-violet-600 transition-colors">{emp.full_name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1"><BookOpen className="w-2.5 h-2.5"/>{nb}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Folder className="w-2.5 h-2.5"/>{fl}</span>
                        </div>
                      </div>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                        <div className="bg-violet-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (nb / maxNb) * 100)}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── USER DETAIL ── */
function UserDetailPanel({ user, notebooks, folders, tab, onTabChange, onSelectPage, onSelectFolder,
  onRoleChange, onDelete, nbExpanded, nbSections, loadingSections, onToggleNotebook }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-start gap-3 flex-wrap">
          <Avatar name={user.full_name} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{user.full_name}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 flex-shrink-0"/><span className="truncate">{user.email}</span>
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                user.role==='admin' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>{user.role}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-500'}`}>
                {user.is_active ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {user.role==='employee'
              ? <button onClick={() => onRoleChange(user.id,'admin')}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 border border-violet-200 transition-colors font-medium">
                  <Crown className="w-3 h-3"/> Promote to Admin
                </button>
              : <button onClick={() => onRoleChange(user.id,'employee')}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-colors font-medium">
                  <User className="w-3 h-3"/> Set Employee
                </button>
            }
            <button onClick={onDelete}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors font-medium">
              <Trash2 className="w-3 h-3"/> Remove User
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          <TabBtn active={tab==='notebooks'} onClick={() => onTabChange('notebooks')}
            icon={<BookOpen className="w-3.5 h-3.5"/>} label={`Notebooks (${notebooks.length})`} />
          <TabBtn active={tab==='folders'} onClick={() => onTabChange('folders')}
            icon={<Folder className="w-3.5 h-3.5"/>} label={`Site Folders (${folders.length})`} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {tab==='notebooks' && (
          <NotebooksTabContent notebooks={notebooks} nbExpanded={nbExpanded} nbSections={nbSections}
            loadingSections={loadingSections} onToggleNotebook={onToggleNotebook} onSelectPage={onSelectPage} />
        )}
        {tab==='folders' && <FoldersTabContent folders={folders} onSelectFolder={onSelectFolder} />}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`}>{icon}{label}</button>
  )
}

/* ── NOTEBOOKS TAB ── */
function NotebooksTabContent({ notebooks, nbExpanded, nbSections, loadingSections, onToggleNotebook, onSelectPage }) {
  const [sectionPages, setSectionPages]       = useState({})
  const [sectionPagesMap, setSectionPagesMap] = useState({})
  const [loadingPages, setLoadingPages]       = useState({})

  const toggleSection = async (s) => {
    const isOpen = !!sectionPages[s.id]
    setSectionPages(prev => ({ ...prev, [s.id]: !isOpen }))
    if (!isOpen && !sectionPagesMap[s.id]) {
      setLoadingPages(prev => ({ ...prev, [s.id]: true }))
      try {
        const ps = await dbQuery('SELECT * FROM mf_pages WHERE section_id = $1 ORDER BY is_pinned DESC, sort_order, created_at', [s.id])
        setSectionPagesMap(prev => ({ ...prev, [s.id]: ps }))
      } finally {
        setLoadingPages(prev => ({ ...prev, [s.id]: false }))
      }
    }
  }

  if (notebooks.length === 0) return (
    <EmptyState icon={<BookOpen className="w-8 h-8 text-gray-300"/>} title="No notebooks yet"
      sub="This user hasn't created any notebooks" small />
  )

  return (
    <div className="space-y-3">
      {notebooks.map(nb => (
        <div key={nb.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div onClick={() => onToggleNotebook(nb)}
            className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${nbExpanded[nb.id] ? 'border-b border-gray-100' : ''}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm"
              style={{backgroundColor: nb.color+'20', border:`1.5px solid ${nb.color}40`}}>
              {nb.emoji || '📓'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{nb.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(nb.updated_at)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {nbSections[nb.id] && <span className="text-xs text-gray-400">{nbSections[nb.id].length} sections</span>}
              {loadingSections[nb.id]
                ? <Loader2 className="w-4 h-4 animate-spin text-gray-400"/>
                : nbExpanded[nb.id] ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>
              }
            </div>
          </div>
          {nbExpanded[nb.id] && (
            <div className="px-3 py-2 space-y-0.5 bg-gray-50/50">
              {(nbSections[nb.id]||[]).length === 0
                ? <p className="text-xs text-gray-400 px-2 py-2 italic">No sections</p>
                : (nbSections[nb.id]||[]).map(s => (
                    <div key={s.id}>
                      <div onClick={() => toggleSection(s)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                          sectionPages[s.id] ? 'bg-white border-gray-200 shadow-sm' : 'hover:bg-white border-transparent'
                        }`}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: s.color}}/>
                        <span className="flex-1 text-xs font-medium text-gray-700 truncate">{s.title}</span>
                        {sectionPages[s.id] ? <ChevronDown className="w-3 h-3 text-gray-400"/> : <ChevronRight className="w-3 h-3 text-gray-400"/>}
                      </div>
                      {sectionPages[s.id] && (
                        <div className="ml-5 mt-0.5 space-y-0.5">
                          {loadingPages[s.id]
                            ? <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin"/>Loading…</div>
                            : (sectionPagesMap[s.id]||[]).length === 0
                              ? <p className="text-xs text-gray-400 px-3 py-1.5 italic">No pages</p>
                              : (sectionPagesMap[s.id]||[]).map(p => (
                                  <div key={p.id} onClick={() => onSelectPage(p)}
                                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white border border-transparent hover:border-gray-200 transition-all">
                                    <FileText className="w-3 h-3 text-gray-400 flex-shrink-0"/>
                                    <span className="flex-1 text-xs text-gray-600 truncate group-hover:text-gray-900">{p.title||'Untitled'}</span>
                                    <span className="text-xs text-gray-300 group-hover:text-gray-500">View →</span>
                                  </div>
                                ))
                          }
                        </div>
                      )}
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── FOLDERS TAB ── */
function FoldersTabContent({ folders, onSelectFolder }) {
  if (folders.length === 0) return (
    <EmptyState icon={<Folder className="w-8 h-8 text-gray-300"/>} title="No site folders"
      sub="This user hasn't created any site folders" small />
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {folders.map(f => (
        <div key={f.id} onClick={() => onSelectFolder(f)}
          className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
            <Folder className="w-5 h-5 text-amber-600"/>
          </div>
          <p className="font-semibold text-gray-800 text-sm truncate mb-1">{f.site_name}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0"/>{f.location}
          </p>
          {f.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{f.description}</p>}
          <p className="text-xs text-gray-300 mt-2">{formatDate(f.updated_at)}</p>
        </div>
      ))}
    </div>
  )
}

/* ── PAGE VIEWER ── */
function AdminPageView({ page, comments, commentText, setCommentText, onSendComment,
  loadingComments, onBack, onDeleteComment, onUpdatePage, onDeletePage }) {
  const [editorMode, setEditorMode] = useState(false)

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-1.5 flex-wrap sm:flex-nowrap overflow-x-auto">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
          ← Back
        </button>
        <span className="text-gray-300 flex-shrink-0">|</span>
        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0"/>
        <span className="font-semibold text-gray-800 text-sm truncate flex-1 min-w-0">{page.title}</span>
        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{formatDate(page.updated_at)}</span>
        <button onClick={() => setEditorMode(m => !m)}
          className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
            editorMode ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100'
          }`}>
          {editorMode ? '✏️ Editor' : '👁 View Only'}
        </button>
        <button onClick={onDeletePage} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden min-h-0 flex-col md:flex-row">
        <div className="flex-1 overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 min-w-0" style={{minHeight: '55%'}}>
          <NoteEditor key={`${page.id}-${editorMode}`} content={page.content}
            onChange={editorMode ? onUpdatePage : undefined} readOnly={!editorMode}/>
        </div>
        <div className="md:w-72 lg:w-80 flex-shrink-0 flex flex-col bg-white" style={{maxHeight: '45%', minHeight: 180}}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-violet-500"/>
            <h3 className="text-sm font-semibold text-gray-800">Comments</h3>
            {comments.length > 0 && (
              <span className="ml-auto bg-violet-100 text-violet-600 text-xs px-2 py-0.5 rounded-full border border-violet-200 font-semibold">{comments.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loadingComments
              ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gray-400 animate-spin"/></div>
              : comments.length === 0
                ? <div className="text-center py-8"><MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2"/><p className="text-gray-400 text-xs">No comments yet</p></div>
                : comments.map(c => (
                    <div key={c.id} className="group bg-gray-50 border border-gray-200 rounded-xl p-3 relative">
                      <div className="flex items-start gap-2 mb-2">
                        <Avatar name={c.full_name} size="sm"/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-gray-800 truncate">{c.full_name}</p>
                            {c.commenter_role==='admin' && <span className="text-xs bg-violet-100 text-violet-600 px-1.5 rounded-full font-medium border border-violet-200">Admin</span>}
                          </div>
                          <p className="text-xs text-gray-400">{formatRelative(c.created_at)}</p>
                        </div>
                        <button onClick={() => onDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all">
                          <X className="w-3 h-3"/>
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{c.comment}</p>
                    </div>
                  ))
            }
          </div>
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <form onSubmit={onSendComment} className="space-y-2">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&e.ctrlKey) onSendComment(e) }}
                rows={3} placeholder="Feedback… (Ctrl+Enter)"
                className="w-full bg-gray-50 border border-gray-200 focus:border-violet-400 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none resize-none transition-colors"/>
              <button type="submit" disabled={!commentText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                <Send className="w-3.5 h-3.5"/> Post Comment
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── FOLDER VIEWER ── */
function AdminFolderViewer({ folder, fetchImages, onBack }) {
  const [images, setImages]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!folder) return
    setLoading(true)
    fetchImages(folder.id).then(setImages).finally(() => setLoading(false))
  }, [folder?.id])

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 sm:px-5 py-3 bg-white border-b border-gray-200 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
          ← Back
        </button>
        <span className="text-gray-300">|</span>
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="w-4 h-4 text-amber-600"/>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-800 text-sm truncate">{folder.site_name}</h2>
          <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>{folder.location}</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-colors ${viewMode==='grid'?'bg-white shadow-sm text-gray-800':'text-gray-400 hover:text-gray-700'}`}><Grid3x3 className="w-3.5 h-3.5"/></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-colors ${viewMode==='list'?'bg-white shadow-sm text-gray-800':'text-gray-400 hover:text-gray-700'}`}><List className="w-3.5 h-3.5"/></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({length:8}).map((_,i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse"/>)}
          </div>
        ) : images.length === 0 ? (
          <EmptyState icon={<ImageIcon className="w-8 h-8 text-gray-300"/>} title="No images yet" sub="Images uploaded to this folder will appear here"/>
        ) : viewMode==='grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map(img => (
              <div key={img.id} onClick={() => setLightbox(img)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer border border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="w-6 h-6 text-white"/>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {images.map(img => (
              <div key={img.id} onClick={() => setLightbox(img)}
                className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer">
                <div className="w-14 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{img.file_name}</p>
                  <p className="text-xs text-gray-400">{formatDate(img.created_at)}</p>
                </div>
                <Eye className="w-4 h-4 text-gray-300 flex-shrink-0"/>
              </div>
            ))}
          </div>
        )}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-8" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"><X className="w-6 h-6"/></button>
          <div className="max-w-4xl max-h-full flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.file_name} className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"/>
            <p className="text-white font-medium text-center">{lightbox.file_name}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── SHARED ── */
function BigStatCard({ icon, label, value, color }) {
  const colors = { violet:'bg-violet-50 border-violet-200 text-violet-600', blue:'bg-blue-50 border-blue-200 text-blue-600', amber:'bg-amber-50 border-amber-200 text-amber-600', purple:'bg-purple-50 border-purple-200 text-purple-600' }
  const c = colors[color] || colors.violet
  return (
    <div className={`${c} border rounded-2xl p-4 flex flex-col gap-2 shadow-sm`}>
      <div className="opacity-80">{icon}</div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
}

function EmptyState({ icon, title, sub, small }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${small?'py-10':'h-full'}`}>
      <div className="mb-3 opacity-60">{icon}</div>
      <p className="font-semibold text-gray-500 text-sm">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 max-w-xs">{sub}</p>}
    </div>
  )
}
