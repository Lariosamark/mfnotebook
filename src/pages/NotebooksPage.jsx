import { useState, useRef, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import NotebookList from '../components/notebook/NotebookList'
import { PageTabs } from '../components/notebook/SectionPanel'
import PageEditor from '../components/notebook/PageEditor'

export default function NotebooksPage() {
  const {
    setActiveNotebook,
    activeSection, setActiveSection,
    activePage, setActivePage
  } = useApp()

  const [viewerMode, setViewerMode] = useState(false)

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
      <div className="flex-shrink-0 overflow-hidden flex flex-col border-r border-gray-200 shadow-panel bg-white"
        style={{ width: notebookWidth }}>
        <NotebookList onSelectSection={handleSelectSection} />
      </div>

      {/* Drag resize handle */}
      <div className="resize-handle" onMouseDown={onMouseDown} title="Drag to resize" />

      {/* Right — Page tabs + Editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Page tabs bar */}
        <PageTabs
          section={activeSection}
          onSelectPage={setActivePage}
          viewerMode={viewerMode}
        />

        {/* Editor fills rest */}
        <div className="flex-1 overflow-hidden">
          <PageEditor
            page={activePage}
            onUpdate={(updated) => setActivePage(updated)}
            viewerMode={viewerMode}
          />
        </div>
      </div>
    </div>
  )
}
