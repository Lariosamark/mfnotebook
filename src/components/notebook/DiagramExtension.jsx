import { useCallback, useState } from 'react'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { Share2, Edit3 } from 'lucide-react'
import DiagramCanvas from './DiagramCanvas'

const DiagramNodeView = ({ node, updateAttributes, selected, extension }) => {
  const editorReadOnly = extension.options.readOnly ?? false

  const data = (() => {
    try { return JSON.parse(node.attrs['data-diagram'] || '{"nodes":[],"edges":[]}') }
    catch { return { nodes: [], edges: [] } }
  })()

  const isSaved  = node.attrs['data-saved'] === 'true'
  const [editing, setEditing] = useState(!isSaved)

  const handleChange = useCallback((newData) => {
    updateAttributes({ 'data-diagram': JSON.stringify(newData) })
  }, [updateAttributes])

  const handleSave = () => {
    updateAttributes({ 'data-saved': 'true' })
    setEditing(false)
  }

  const isLocked = (isSaved && !editing) || editorReadOnly

  return (
    <NodeViewWrapper className="diagram-node-wrapper my-4">
      <div className={`rounded-xl transition-all w-full ${selected ? 'ring-2 ring-blue-400' : ''}`}>

        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-t-xl border-b-0 flex-wrap">
          <Share2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-700 flex-shrink-0">Diagram</span>

          {isLocked
            ? <span className="text-xs text-blue-400 hidden sm:inline">
                {editorReadOnly ? '· view only' : '· click Change to edit'}
              </span>
            : <span className="text-xs text-blue-400 hidden sm:inline">
                · drag to move · double-click to rename
              </span>
          }

          <div className="ml-auto flex items-center gap-1.5">
            {!editorReadOnly && isSaved && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 border border-blue-300 font-semibold transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>Change</span>
              </button>
            )}
            {!editorReadOnly && editing && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 font-semibold transition-colors"
              >
                ✓ Done
              </button>
            )}
          </div>
        </div>

        {/* ── Canvas ── */}
        {/*
          Height strategy:
            - clamp(260px, 55vw, 520px) gives ~260px on phones, up to 520px on desktop.
            - On very wide viewports (editors ≥ 900px) the 55vw cap kicks in just right.
            - Override via the style prop if you need a taller/shorter instance.
        */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 'clamp(260px, 55vw, 520px)',
          }}
        >
          <DiagramCanvas
            data={data}
            onChange={isLocked ? undefined : handleChange}
            readOnly={isLocked}
            style={{
              height: '100%',
              minHeight: 0,          /* let the parent clamp control height */
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
          />

          {/* Interaction blocker when locked (prevents accidental panning in read-only) */}
          {isLocked && (
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'default' }}
              title={editorReadOnly ? 'View only' : 'Click Change to edit'}
            />
          )}
        </div>

      </div>
    </NodeViewWrapper>
  )
}

const DiagramExtension = TiptapNode.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addOptions() { return { readOnly: false } },
  addAttributes() {
    return {
      'data-diagram': { default: '{"nodes":[],"edges":[]}' },
      'data-saved':   { default: 'false' },
    }
  },
  parseHTML()  { return [{ tag: 'div[data-type="diagram"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'diagram' })]
  },
  addNodeView() { return ReactNodeViewRenderer(DiagramNodeView) },
})

export default DiagramExtension