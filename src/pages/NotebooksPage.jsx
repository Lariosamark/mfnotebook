import { useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { PageTabs } from '../components/notebook/SectionPanel'
import PageEditor from '../components/notebook/PageEditor'
import { BookOpen, Loader2, MousePointerClick, BookMarked } from 'lucide-react'

export default function NotebooksPage() {
  const {
    activeNotebook,
    activeSection, setActiveSection,
    activePage, setActivePage,
    notebookSwitching,
    isSharedNotebook,
    setSidebarOpen,
  } = useApp()

  // Shared notebooks are view-only for employees
  const viewerMode = isSharedNotebook

  useEffect(() => {
    if (!activeSection) {
      // Reset shared flag when no section is active
    }
  }, [activeSection])

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 relative">

      {/* Right — Page tabs + Editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <BookMarked className="w-3.5 h-3.5" />
            {activeNotebook ? activeNotebook.title : 'Notebooks'}
          </button>
          {activeSection && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5 truncate min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeSection.color }} />
              <span className="truncate">{activeSection.title}</span>
            </span>
          )}
        </div>

        {notebookSwitching ? (
          <NotebookLoadingState notebookTitle={activeNotebook?.title} />
        ) : (
          <>
            <PageTabs
              section={activeSection}
              onSelectPage={setActivePage}
              viewerMode={viewerMode}
            />

            {activeNotebook && !activeSection && (
              <NoSectionSelected notebook={activeNotebook} onOpenList={() => setSidebarOpen(true)} />
            )}

            {!activeNotebook && !activeSection && (
              <NoNotebookSelected onOpenList={() => setSidebarOpen(true)} />
            )}

            {activeSection && (
              <div className="flex-1 overflow-hidden">
                <PageEditor
                  page={activePage}
                  onUpdate={(updated) => setActivePage(updated)}
                  viewerMode={viewerMode}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function NotebookLoadingState({ notebookTitle }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-10">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600">
          Opening{notebookTitle ? ` "${notebookTitle}"` : ' notebook'}…
        </p>
        <p className="text-xs text-gray-400 mt-1">Loading sections, please wait</p>
      </div>
      <div className="w-56 space-y-2 mt-2">
        {[80, 60, 72, 50].map((w, i) => (
          <div key={i} className="h-3 rounded-full bg-gray-100 animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  )
}

function NoNotebookSelected({ onOpenList }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center">
        <BookOpen className="w-6 h-6 text-brand-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600">No notebook open</p>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-center">
          <MousePointerClick className="w-3.5 h-3.5" />
          Select a notebook from the sidebar
        </p>
      </div>
      <button
        onClick={onOpenList}
        className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-2"
      >
        <BookMarked className="w-4 h-4" />
        Open Notebooks
      </button>
    </div>
  )
}

function NoSectionSelected({ notebook, onOpenList }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center">
        <BookOpen className="w-6 h-6 text-brand-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600">{notebook.title}</p>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-center">
          <MousePointerClick className="w-3.5 h-3.5" />
          Select a section from the sidebar
        </p>
      </div>
      <button
        onClick={onOpenList}
        className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-2"
      >
        <BookMarked className="w-4 h-4" />
        Choose a Section
      </button>
    </div>
  )
}
