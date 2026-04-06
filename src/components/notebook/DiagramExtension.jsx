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

  const isSaved = node.attrs['data-saved'] === 'true'
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
      <div className={`rounded-xl transition-all ${selected ? 'ring-2 ring-brand-400' : ''}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-200 rounded-t-xl border-b-0 flex-wrap">
          <Share2 className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-brand-700">Diagram / Topology</span>
          {isLocked
            ? <span className="text-xs text-brand-400 ml-1">{editorReadOnly ? '· View only — admin controls editing' : '· Click Change to edit'}</span>
            : <span className="text-xs text-brand-400 ml-1">· drag to move nodes · double-click to rename</span>
          }
          <div className="ml-auto flex items-center gap-1.5">
            {!editorReadOnly && isSaved && !editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 px-2 py-0.5 rounded-lg bg-brand-100 hover:bg-brand-200 border border-brand-300 font-semibold transition-colors">
                <Edit3 className="w-3 h-3" /> Change
              </button>
            )}
            {!editorReadOnly && editing && (
              <button onClick={handleSave}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 font-semibold transition-colors">
                ✓ Done
              </button>
            )}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <DiagramCanvas data={data} onChange={isLocked ? undefined : handleChange} readOnly={isLocked} />
          {isLocked && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'default' }}
              title={editorReadOnly ? 'View only' : 'Click Change to edit'} />
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
