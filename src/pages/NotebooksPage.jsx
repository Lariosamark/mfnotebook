import { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import NotebookList from '../components/notebook/NotebookList'
import { PageTabs } from '../components/notebook/SectionPanel'
import PageEditor from '../components/notebook/PageEditor'
import { BookOpen, Loader2, MousePointerClick } from 'lucide-react'

export default function NotebooksPage() {
  const {
    activeNotebook,
    activeSection, setActiveSection,
    activePage, setActivePage,
    notebookSwitching,
  } = useApp()

  const [viewerMode, setViewerMode] = useState(false)

  // Reset viewerMode when section is cleared (e.g. switching notebooks)
  useEffect(() => {
    if (!activeSection) setViewerMode(false)
  }, [activeSection])

  // Resizable notebook sidebar
  const [notebookWidth, setNotebookWidth] = useState(240)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = notebookWidth

    const onMove = (e) => {
      if (!dragging.current) return
      const newW = Math.min(340, Math.max(180, startW.current + (e.clientX - startX.current)))
      setNotebookWidth(newW)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [notebookWidth])

  const handleSelectSection = (s, isShared = false) => {
    setActiveSection(s)
    setActivePage(null)
    setViewerMode(!!isShared)
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left — Notebooks + inline sections tree */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col border-r border-gray-200 shadow-panel bg-white"
        style={{ width: notebookWidth }}
      >
        <NotebookList onSelectSection={handleSelectSection} />
      </div>

      {/* Drag resize handle */}
      <div className="resize-handle" onMouseDown={onMouseDown} title="Drag to resize" />

      {/* Right — Page tabs + Editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Loading state: switching notebook, sections being fetched ── */}
        {notebookSwitching ? (
          <NotebookLoadingState notebookTitle={activeNotebook?.title} />
        ) : (
          <>
            {/* Page tabs bar — only shown when a section is active */}
            <PageTabs
              section={activeSection}
              onSelectPage={setActivePage}
              viewerMode={viewerMode}
            />

            {/* ── Empty state: notebook selected, but no section chosen yet ── */}
            {activeNotebook && !activeSection && (
              <NoSectionSelected notebook={activeNotebook} />
            )}

            {/* Editor — only shown when a section is active */}
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

/* ── Loading skeleton shown while sections are being fetched ── */
function NotebookLoadingState({ notebookTitle }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-10">
      {/* Spinner */}
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-600">
          Opening{notebookTitle ? ` "${notebookTitle}"` : ' notebook'}…
        </p>
        <p className="text-xs text-gray-400 mt-1">Loading sections, please wait</p>
      </div>

      {/* Skeleton rows */}
      <div className="w-56 space-y-2 mt-2">
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

/* ── Placeholder shown when a notebook is open but no section chosen ── */
function NoSectionSelected({ notebook }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center">
        <BookOpen className="w-6 h-6 text-brand-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600">
          {notebook.title}
        </p>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-center">
          <MousePointerClick className="w-3.5 h-3.5" />
          Select a section on the left to get started
        </p>
      </div>
    </div>
  )
}
