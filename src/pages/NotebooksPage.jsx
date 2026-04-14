import { useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { PageTabs } from '../components/notebook/SectionPanel'
import PageEditor from '../components/notebook/PageEditor'
import { BookOpen, Loader2, MousePointerClick, BookMarked, Eye } from 'lucide-react'

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
            <span className="truncate max-w-[100px]">
              {activeNotebook ? activeNotebook.title : 'Notebooks'}
            </span>
          </button>

          {activeSection && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5 truncate min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeSection.color }} />
              <span className="truncate">{activeSection.title}</span>
            </span>
          )}

          {/* Shared / view-only badge on mobile */}
          {viewerMode && (
            <span className="flex-shrink-0 flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-full font-medium ml-auto">
              <Eye className="w-3 h-3" />
              <span className="hidden xs:inline">View Only</span>
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
              <NoSectionSelected
                notebook={activeNotebook}
                onOpenList={() => setSidebarOpen(true)}
                isShared={viewerMode}
              />
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
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-6 sm:p-10">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600">
          Opening{notebookTitle ? ` "${notebookTitle}"` : ' notebook'}…
        </p>
        <p className="text-xs text-gray-400 mt-1">Loading sections, please wait</p>
      </div>
      <div className="w-48 sm:w-56 space-y-2 mt-2">
        {[80, 60, 72, 50].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-full bg-gray-100 animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function NoNotebookSelected({ onOpenList }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6 sm:p-10">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center">
        <BookOpen className="w-6 h-6 text-brand-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600">No notebook open</p>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-center">
          <MousePointerClick className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Select a notebook from the sidebar</span>
          <span className="sm:hidden">Tap below to open a notebook</span>
        </p>
      </div>
      {/* Always visible on mobile; hidden on desktop where sidebar is always shown */}
      <button
        onClick={onOpenList}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-2 md:hidden"
      >
        <BookMarked className="w-4 h-4" />
        Open Notebooks
      </button>
    </div>
  )
}

function NoSectionSelected({ notebook, onOpenList, isShared }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6 sm:p-10">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center">
        <BookOpen className="w-6 h-6 text-brand-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600 truncate max-w-[200px] sm:max-w-xs mx-auto">
          {notebook.title}
        </p>
        {isShared && (
          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium mt-1">
            <Eye className="w-3 h-3" /> Shared — View Only
          </span>
        )}
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 justify-center">
          <MousePointerClick className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Select a section from the sidebar</span>
          <span className="sm:hidden">Tap below to choose a section</span>
        </p>
      </div>
      <button
        onClick={onOpenList}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-2 md:hidden"
      >
        <BookMarked className="w-4 h-4" />
        Choose a Section
      </button>
    </div>
  )
}