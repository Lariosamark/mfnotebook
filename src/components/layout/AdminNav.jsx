import { useState, useEffect } from 'react'
import { useUsers } from '../../hooks/useFolders'
import { useNotebooks } from '../../hooks/useNotebooks'
import { useFolders } from '../../hooks/useFolders'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar } from './Sidebar'
import {
  Shield, Users, LayoutDashboard, Search,
  BookOpen, Folder, Crown, User, Trash2
} from 'lucide-react'

export default function AdminNav() {
  const { profile } = useAuth()
  const { users, loading: loadingUsers, fetchUsers, updateUser, deleteUser } = useUsers()
  const { notebooks, fetchAllNotebooks } = useNotebooks()
  const { folders, fetchFolders } = useFolders()
  const {
    activeAdminTab, setActiveAdminTab,
    adminSelectedUser, setAdminSelectedUser,
    showToast,
  } = useApp()

  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    if (profile) {
      fetchUsers()
      fetchAllNotebooks()
      fetchFolders()
    }
  }, [profile?.id])

  const handleSelectUser = (u) => {
    setAdminSelectedUser(u)
    setActiveAdminTab('users')
  }

  const handleRoleChange = async (userId, role) => {
    await updateUser(userId, { role })
    showToast(`Role updated to ${role}`)
    await fetchUsers()
  }

  const handleDelete = async (userId) => {
    if (!confirm('Remove this user permanently?')) return
    await deleteUser(userId)
    if (adminSelectedUser?.id === userId) setAdminSelectedUser(null)
    showToast('User removed')
    await fetchUsers()
  }

  const adminCount    = users.filter(u => u.role === 'admin').length
  const employeeCount = users.filter(u => u.role === 'employee').length

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (roleFilter === 'all' || u.role === roleFilter)
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Admin Panel</span>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 px-2 py-2 flex-shrink-0">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'users',    label: loadingUsers ? 'Users' : `Users (${users.length})`, icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveAdminTab(id); if (id === 'overview') setAdminSelectedUser(null) }}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
              activeAdminTab === id
                ? 'bg-violet-100 text-violet-700 border border-violet-200'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Quick stats */}
      <div className="px-3 pb-2 flex-shrink-0 space-y-0.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">Quick Stats</p>
        <StatRow icon={<BookOpen className="w-3 h-3 text-blue-500"/>}   label="Notebooks"    value={notebooks.length} loading={loadingUsers} />
        <StatRow icon={<Folder className="w-3 h-3 text-amber-500"/>}    label="Site Folders" value={folders.length}   loading={loadingUsers} />
        <StatRow icon={<Crown className="w-3 h-3 text-violet-500"/>}    label="Admins"       value={adminCount}       loading={loadingUsers} />
        <StatRow icon={<User className="w-3 h-3 text-emerald-500"/>}    label="Employees"    value={employeeCount}    loading={loadingUsers} />
      </div>

      {/* User list — shown when users tab active */}
      {activeAdminTab === 'users' && (
        <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-100">
          <div className="px-2 pt-2 pb-1 space-y-1.5 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400"
              />
            </div>
            <div className="flex gap-1">
              {['all', 'admin', 'employee'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`flex-1 py-1 text-[10px] rounded-md transition-colors capitalize font-semibold ${
                    roleFilter === r ? 'bg-violet-100 text-violet-600 border border-violet-200' : 'bg-gray-100 text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {loadingUsers
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded-xl animate-pulse" />)
              : filtered.map(u => (
                  <UserItem
                    key={u.id}
                    user={u}
                    active={adminSelectedUser?.id === u.id}
                    onClick={() => handleSelectUser(u)}
                    onRoleChange={handleRoleChange}
                    onDelete={() => handleDelete(u.id)}
                  />
                ))
            }
          </div>
        </div>
      )}

      {/* Overview placeholder space */}
      {activeAdminTab === 'overview' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 pb-4 opacity-40">
          <LayoutDashboard className="w-7 h-7 text-gray-400" />
          <p className="text-xs text-gray-400 text-center px-4">Dashboard shown in main area</p>
        </div>
      )}
    </div>
  )
}

function StatRow({ icon, label, value, loading }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
      {icon}
      <span className="text-xs text-gray-500 flex-1">{label}</span>
      {loading
        ? <span className="w-4 h-2.5 bg-gray-200 rounded animate-pulse" />
        : <span className="text-xs font-bold text-gray-700">{value}</span>
      }
    </div>
  )
}

function UserItem({ user, active, onClick, onRoleChange, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border ${
        active ? 'bg-violet-50 border-violet-200' : 'hover:bg-gray-50 border-transparent'
      }`}
    >
      <Avatar name={user.full_name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{user.full_name}</p>
        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
        user.role === 'admin' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {user.role}
      </span>
      <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 transition-all"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 4 16">
            <circle cx="2" cy="2" r="2"/><circle cx="2" cy="8" r="2"/><circle cx="2" cy="14" r="2"/>
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {user.role === 'employee'
              ? <button onClick={() => { onRoleChange(user.id, 'admin'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-600 hover:bg-violet-50 transition-colors">
                  <Crown className="w-3 h-3"/> Promote to Admin
                </button>
              : <button onClick={() => { onRoleChange(user.id, 'employee'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  <User className="w-3 h-3"/> Set as Employee
                </button>
            }
            <button onClick={() => { onDelete(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3"/> Remove User
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
