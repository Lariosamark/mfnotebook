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

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-card">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span className="text-sm font-medium">Loading MFNotebook…</span>
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
