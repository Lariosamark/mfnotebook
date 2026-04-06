import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'

import DiagramExtension from './DiagramExtension'
import MapExtension from './MapExtension'
import VoiceRecordingExtension from './VoiceRecordingExtension'
import EditorToolbar from './EditorToolbar'
import VoiceRecorderPanel from './VoiceRecorderPanel'

export default function NoteEditor({ content, onChange, readOnly = false }) {
  const [showVoice, setShowVoice] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      TextStyle,
      Color,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing your note…' }),
      DiagramExtension.configure({ readOnly }),
      MapExtension.configure({ readOnly }),
      VoiceRecordingExtension,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    // Defer to avoid flushSync warning in React 18 — TipTap's setContent
    // dispatches a ProseMirror transaction which can trigger React state
    // updates while React is already rendering.
    const id = setTimeout(() => {
      if (!editor.isDestroyed && content !== editor.getHTML()) {
        editor.commands.setContent(content || '', false)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVoiceInsert = (nodeOrText) => {
    if (!editor) return
    if (typeof nodeOrText === 'object') {
      editor.chain().focus().insertContent(nodeOrText).run()
    } else {
      editor.chain().focus().insertContent(nodeOrText + ' ').run()
    }
  }

  if (!editor) return null

  return (
    <div className="flex flex-col h-full app-editor-area min-h-0">
      {!readOnly && <EditorToolbar editor={editor} onVoice={() => setShowVoice(true)} />}
      <div className="flex-1 overflow-y-auto min-h-0">
        <EditorContent editor={editor} className="prose-editor h-full" />
      </div>
      {showVoice && (
        <VoiceRecorderPanel
          onInsert={handleVoiceInsert}
          onClose={() => setShowVoice(false)}
        />
      )}
    </div>
  )
}
