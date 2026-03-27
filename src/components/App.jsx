import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import LoginPage from './auth/LoginPage'
import Sidebar from './layout/Sidebar'
import NotebooksPage from '../pages/NotebooksPage'
import FoldersPage from '../pages/FoldersPage'
import AdminPage from '../pages/AdminPage'
import Toast from './ui/Toast'
import { Loader2, BookOpen } from 'lucide-react'

export default function App() {
  const { user, loading } = useAuth()
  const { activeView, setActiveView } = useApp()

  // Full-screen loading splash while checking localStorage / Supabase session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
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

  // Not logged in → show login
  if (!user) return <LoginPage />

  // Logged in → show app
  const views = {
    notebooks: <NotebooksPage />,
    folders:   <FoldersPage />,
    admin:     <AdminPage />,
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar onNavigate={setActiveView} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-hidden animate-fade-in">
          {views[activeView] || <NotebooksPage />}
        </main>
      </div>
      <Toast />
    </div>
  )
}
