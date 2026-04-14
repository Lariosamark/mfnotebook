import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import LoginPage from './auth/LoginPage'
import Sidebar from './layout/Sidebar'
import NotebooksPage from '../pages/NotebooksPage'
import FoldersPage from '../pages/FoldersPage'
import AdminPage from '../pages/AdminPage'
import Toast from './ui/Toast'
import { Loader2, BookOpen, Menu, RefreshCw } from 'lucide-react'

export default function App() {
  const { user, loading, switching } = useAuth()
  const { activeView, setActiveView, activePage, activeNotebook, activeSection,
          sidebarOpen, setSidebarOpen } = useApp()

  useEffect(() => {
    document.title = activePage?.title ? `${activePage.title} — MFNotebook` : 'MFNotebook'
  }, [activePage?.title])

  // Initial app loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center gap-5 animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2.5 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
            <span className="text-sm font-medium">Restoring your session…</span>
          </div>
        </div>
      </div>
    )
  }

  // Account switch loading screen (same PC, different account)
  if (switching) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center gap-6 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl mb-2">Switching Account</h2>
            <p className="text-slate-400 text-sm">A different account has been detected.<br/>Loading your workspace…</p>
          </div>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full animate-[loading_1.2s_ease-in-out_infinite]" style={{width:'60%'}} />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  const views = {
    notebooks: <NotebooksPage />,
    folders:   <FoldersPage />,
    admin:     <AdminPage />,
  }

  const viewLabels = { notebooks: 'Notebooks', folders: 'Site Folders', admin: 'Admin Panel' }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar onNavigate={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Mobile top bar ── */}
        <header className="lg:hidden flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 bg-white flex-shrink-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl app-sidebar text-white hover:bg-white/20 transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <BookOpen className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-700 truncate">
              {activePage?.title || activeNotebook?.title || viewLabels[activeView] || 'MFNotebook'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {views[activeView] || <NotebooksPage />}
        </main>
      </div>

      <Toast />
    </div>
  )
}
