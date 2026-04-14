import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

const VoiceRecordingNodeView = ({ node, selected }) => {
  const audioSrc   = node.attrs['data-audio']      || ''
  const transcript = node.attrs['data-transcript'] || ''
  const timestamp  = node.attrs['data-timestamp']  || ''
  const duration   = node.attrs['data-duration']   || ''

  return (
    <NodeViewWrapper className="voice-recording-node my-3" contentEditable={false}>
      <div
        className={`rounded-xl border-2 overflow-hidden transition-all ${
          selected ? 'border-violet-400' : 'border-violet-100'
        }`}
        style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-violet-100">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span style={{ fontSize: 13 }}>🎙</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-violet-700">Voice Recording</p>
            <p className="text-[11px] text-violet-400">
              {timestamp}{duration ? ` · ${duration}` : ''}
            </p>
          </div>
        </div>

        {/* Audio player */}
        {audioSrc && (
          <div className="px-4 pt-3 pb-1">
            <audio
              controls
              playsInline
              preload="metadata"
              src={audioSrc}
              style={{ width: '100%', borderRadius: 8, height: 36, display: 'block' }}
            />
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="px-4 pt-2 pb-4">
            {audioSrc && <div className="border-t border-violet-100 mb-2.5" />}
            <p className="text-[11px] font-semibold text-violet-400 mb-1 uppercase tracking-wide">
              Transcript
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

const VoiceRecordingExtension = TiptapNode.create({
  name: 'voicerecording',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      'data-audio':      { default: '' },
      'data-transcript': { default: '' },
      'data-timestamp':  { default: '' },
      'data-duration':   { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="voicerecording"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'voicerecording' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VoiceRecordingNodeView)
  },
})

export default VoiceRecordingExtension