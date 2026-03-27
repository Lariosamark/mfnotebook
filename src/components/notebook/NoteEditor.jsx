import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Image as ImageIcon, Link as LinkIcon, Undo, Redo,
  Code, Quote, Minus, Type, ChevronDown
} from 'lucide-react'

const COLORS = ['#111827','#15803d','#1d4ed8','#dc2626','#d97706','#7c3aed','#0891b2','#db2777']

export default function NoteEditor({ content, onChange, readOnly = false }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      TextStyle,
      Color,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Start typing your note…' }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  // Content is set via key={page.id} remount in PageEditor — no effect needed here

  if (!editor) return null

  return (
    <div className="flex flex-col h-full app-editor-area">
      {!readOnly && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="prose-editor h-full" />
      </div>
    </div>
  )
}

function EditorToolbar({ editor }) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const addImage = () => {
    const url = window.prompt('Image URL')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setShowLinkInput(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-4 py-1.5 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
      {/* History */}
      <Group>
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      {/* Headings */}
      <Group>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      {/* Formatting */}
      <Group>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}      title="Bold">       <Bold className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}    title="Italic">     <Italic className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">  <UnderlineIcon className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()}    active={editor.isActive('strike')}    title="Strike">     <Strikethrough className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()}      active={editor.isActive('code')}      title="Code">       <Code className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      {/* Lists */}
      <Group>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet List">   <List className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">  <ListOrdered className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive('blockquote')}  title="Quote">         <Quote className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      {/* Color picker */}
      <div className="relative">
        <Btn onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
          <div className="flex flex-col items-center gap-0.5">
            <Type className="w-3.5 h-3.5" />
            <div className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#111827' }} />
          </div>
        </Btn>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-xl shadow-lifted z-20 flex flex-wrap gap-1.5 w-28">
            {COLORS.map((c) => (
              <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false) }}
                style={{ backgroundColor: c }}
                className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform shadow-sm" />
            ))}
            <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false) }}
              className="w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 text-xs flex items-center justify-center transition-colors">✕</button>
          </div>
        )}
      </div>
      <Sep />

      {/* Media */}
      <Group>
        <Btn onClick={addImage} title="Insert Image"><ImageIcon className="w-3.5 h-3.5" /></Btn>
        <div className="relative">
          <Btn onClick={() => setShowLinkInput(!showLinkInput)} active={editor.isActive('link')} title="Link"><LinkIcon className="w-3.5 h-3.5" /></Btn>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-xl shadow-lifted z-20 flex gap-2 w-64">
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setLink()}
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-brand-400"
                placeholder="https://…" autoFocus />
              <button onClick={setLink} className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg font-semibold transition-colors">Set</button>
            </div>
          )}
        </div>
      </Group>
    </div>
  )
}

const Group = ({ children }) => <div className="flex items-center gap-0.5">{children}</div>
const Sep   = () => <div className="w-px h-4 bg-gray-200 mx-1" />

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 rounded-lg transition-all text-sm ${
        active
          ? 'bg-brand-100 text-brand-700'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      } disabled:opacity-30 disabled:cursor-not-allowed`}>
      {children}
    </button>
  )
}