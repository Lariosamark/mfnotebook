import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNotebook, setActiveNotebook] = useState(null)
  const [activeSection, setActiveSection]   = useState(null)
  const [activePage, setActivePage]         = useState(null)
  const [activeView, setActiveView]         = useState('notebooks')
  const [activeFolder, setActiveFolder]     = useState(null)
  const [toast, setToast]                   = useState(null)
  const [notebookSwitching, setNotebookSwitching] = useState(false)
  const [isSharedNotebook, setIsSharedNotebook]   = useState(false)

  // Admin shared state
  const [activeAdminTab, setActiveAdminTab]       = useState('overview')
  const [adminSelectedUser, setAdminSelectedUser] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <AppContext.Provider value={{
      sidebarOpen, setSidebarOpen,
      activeNotebook, setActiveNotebook,
      activeSection, setActiveSection,
      activePage, setActivePage,
      activeView, setActiveView,
      activeFolder, setActiveFolder,
      toast, showToast,
      notebookSwitching, setNotebookSwitching,
      isSharedNotebook, setIsSharedNotebook,
      activeAdminTab, setActiveAdminTab,
      adminSelectedUser, setAdminSelectedUser,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
