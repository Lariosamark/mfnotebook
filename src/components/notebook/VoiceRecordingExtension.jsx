import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useRef } from 'react'

const VoiceRecordingNodeView = ({ node, selected }) => {
  const audioSrc   = node.attrs['data-audio']      || ''
  const transcript = node.attrs['data-transcript'] || ''
  const timestamp  = node.attrs['data-timestamp']  || ''
  const duration   = node.attrs['data-duration']   || ''
  const audioRef   = useRef(null)

  /**
   * On iOS/Android the <audio> src can be a long base64 data-URI.
   * Safari on iOS refuses to seek or sometimes even play a base64 audio/webm.
   * Converting it back to a Blob URL at render time fixes playback on all devices.
   */
  const resolvedSrc = (() => {
    if (!audioSrc) return ''
    // Already a blob URL or plain http — use as-is
    if (audioSrc.startsWith('blob:') || audioSrc.startsWith('http')) return audioSrc
    // base64 data-URI — convert to Blob URL so mobile Safari can play it
    try {
      const [header, b64] = audioSrc.split(',')
      const mime = header.match(/:(.*?);/)?.[1] || 'audio/webm'
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })
      return URL.createObjectURL(blob)
    } catch {
      return audioSrc // fallback to raw src
    }
  })()

  return (
    <NodeViewWrapper className="voice-recording-node my-3" contentEditable={false}>
      <div
        className={`rounded-xl border-2 overflow-hidden transition-all ${selected ? 'border-violet-400' : 'border-violet-100'}`}
        style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-violet-100">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span style={{ fontSize: 13 }}>🎙</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-violet-700">Voice Recording</p>
            <p className="text-[11px] text-violet-400 truncate">
              {timestamp}{duration ? ` · ${duration}` : ''}
            </p>
          </div>
        </div>

        {/* Audio player */}
        {resolvedSrc && (
          <div className="px-4 pt-3 pb-1">
            {/*
              - preload="metadata" prevents auto-downloading the full base64 on iOS
              - playsInline prevents iOS from opening the system player in fullscreen
              - controlsList hides the download button (cosmetic)
            */}
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              playsInline
              src={resolvedSrc}
              className="w-full"
              style={{ borderRadius: 8, display: 'block', minHeight: 36 }}
            />
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="px-4 pt-2 pb-4">
            {resolvedSrc && <div className="border-t border-violet-100 mb-2.5" />}
            <p className="text-[11px] font-semibold text-violet-400 mb-1 uppercase tracking-wide">
              Transcript
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
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
  parseHTML()  { return [{ tag: 'div[data-type="voicerecording"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'voicerecording' })]
  },
  addNodeView() { return ReactNodeViewRenderer(VoiceRecordingNodeView) },
})

export default VoiceRecordingExtension