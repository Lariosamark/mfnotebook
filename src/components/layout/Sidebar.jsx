import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { BookOpen, FolderOpen, Shield, LogOut, ChevronLeft, ChevronRight, Menu, X, StickyNote, Share2, Bell, Settings, Search } from 'lucide-react'

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const NAV = [
  { id: 'notebooks', label: 'Notebooks',   icon: BookOpen,   desc: 'Notes & pages' },
  { id: 'folders',   label: 'Site Folders', icon: FolderOpen, desc: 'Site images' },
]

export default function Sidebar({ onNavigate }) {
  const { profile, signOut, isAdmin } = useAuth()
  const { sidebarOpen, setSidebarOpen, activeView } = useApp()
  const [userMenu, setUserMenu] = useState(false)

  const navItems = isAdmin
    ? [...NAV, { id: 'admin', label: 'Admin Panel', icon: Shield, desc: 'Manage users' }]
    : NAV

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:relative z-30 flex flex-col h-full app-sidebar
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-56 translate-x-0' : 'w-0 lg:w-14 -translate-x-full lg:translate-x-0'}
      `}>
        {sidebarOpen ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-white text-sm leading-tight tracking-tight">MFNotebook</p>
                  <p className="text-green-300 text-xs opacity-70">Workspace</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)}
                className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden lg:flex">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setSidebarOpen(false)}
                className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors lg:hidden">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 border-b border-white/10">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-left">
                <Search className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
                <span className="text-xs text-white/40 font-medium">Search notes…</span>
                <kbd className="ml-auto text-xs text-white/30 font-mono">⌘K</kbd>
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
              <p className="text-xs font-semibold text-green-300/50 uppercase tracking-widest px-2 mb-2 mt-1">Navigation</p>
              {navItems.map((item) => {
                const Icon = item.icon
                const active = activeView === item.id
                return (
                  <button key={item.id} onClick={() => { onNavigate(item.id); if (window.innerWidth < 1024) setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      active
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-green-300' : 'text-white/50'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300 flex-shrink-0 animate-pulse" />}
                  </button>
                )
              })}
            </nav>

            {/* Bottom actions */}
            <div className="px-3 pb-2 border-t border-white/10 pt-2 space-y-0.5">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">Settings</span>
              </button>
            </div>

            {/* User */}
            <div className="p-2.5 border-t border-white/10">
              <div className="relative">
                <button onClick={() => setUserMenu(!userMenu)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors">
                  <Avatar name={profile?.full_name} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-green-300/60 capitalize mt-0.5">{profile?.role || 'employee'}</p>
                  </div>
                </button>

                {userMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lifted overflow-hidden animate-scale-in">
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
        ) : (
          /* Collapsed */
          <div className="hidden lg:flex flex-col h-full items-center py-3 gap-1.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-2">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <button onClick={() => setSidebarOpen(true)}
              className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors mb-1">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex-1 flex flex-col gap-1 items-center">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = activeView === item.id
                return (
                  <button key={item.id} title={item.label} onClick={() => onNavigate(item.id)}
                    className={`p-2.5 rounded-xl transition-all ${
                      active ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}>
                    <Icon className="w-4 h-4" />
                  </button>
                )
              })}
            </div>
            <button onClick={signOut} title="Sign Out"
              className="p-2.5 rounded-xl text-white/40 hover:text-red-300 hover:bg-white/10 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

export function Avatar({ name, size = 'md' }) {
  const initials = getInitials(name)
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs'
  const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-green-600', 'bg-lime-600', 'bg-cyan-500', 'bg-green-500']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`${s} ${color} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 text-xs shadow-sm`}>
      {initials}
    </div>
  )
}

/* ─── Top Bar ─────────────────────────────────────────────── */
export function TopBar() {
  const { setSidebarOpen, sidebarOpen, activeView, activeNotebook } = useApp()
  const { profile } = useAuth()

  const titles = { notebooks: activeNotebook?.title || 'Notebooks', folders: 'Site Folders', admin: 'Admin Panel' }

  return (
    <div className="flex items-center h-11 px-4 bg-white border-b border-gray-200 gap-3 shadow-sm">
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Menu className="w-4 h-4" />
      </button>

      {/* App menu items like OneNote */}
      <div className="hidden lg:flex items-center gap-0.5">
        {['File', 'Home', 'Insert', 'Draw', 'History', 'Review', 'View', 'Help'].map((item) => (
          <button key={item}
            className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
            {item}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200">
          <StickyNote className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Sticky Notes</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm">
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
        </button>
        <Avatar name={profile?.full_name} size="sm" />
      </div>
    </div>
  )
}
