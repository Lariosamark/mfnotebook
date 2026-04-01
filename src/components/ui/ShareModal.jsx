import { useState } from 'react'
import {
  X, Share2, Mail, Copy, CheckCheck,
  ExternalLink, MessageSquare, FileText
} from 'lucide-react'

/* ── Strip HTML → plain text ───────────────────────────── */
function htmlToPlainText(html) {
  if (!html) return ''
  const withNewlines = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
  const stripped = withNewlines.replace(/<[^>]+>/g, '')
  const decoded = stripped
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return decoded.replace(/\n{3,}/g, '\n\n').trim()
}

/* ── Share targets ─────────────────────────────────────── */
const SHARE_TARGETS = [
  {
    id: 'gmail',
    label: 'Gmail',
    color: '#EA4335',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M2 6.5A2.5 2.5 0 014.5 4h15A2.5 2.5 0 0122 6.5v11A2.5 2.5 0 0119.5 20h-15A2.5 2.5 0 012 17.5v-11z" fill="#fff" stroke="#EA4335" strokeWidth="1.2"/>
        <path d="M2 7l10 6.5L22 7" stroke="#EA4335" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    build: ({ subject, body, to }) =>
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  },
  {
    id: 'outlook',
    label: 'Outlook',
    color: '#0078D4',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" fill="#fff" stroke="#0078D4" strokeWidth="1.2"/>
        <path d="M2 8l10 6 10-6" stroke="#0078D4" strokeWidth="1.6" strokeLinecap="round"/>
        <rect x="2" y="4" width="9" height="10" rx="2" fill="#0078D4" opacity=".15"/>
        <text x="6.5" y="12" fontSize="6" fontWeight="bold" fill="#0078D4" fontFamily="sans-serif">O</text>
      </svg>
    ),
    build: ({ subject, body, to }) =>
      `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  },
  {
    id: 'yahoo',
    label: 'Yahoo Mail',
    color: '#6001D2',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" fill="#fff" stroke="#6001D2" strokeWidth="1.2"/>
        <path d="M5 8l4 5v4M19 8l-4 5v4M9 13l3-5 3 5" stroke="#6001D2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    build: ({ subject, body, to }) =>
      `https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  },
  {
    id: 'mailto',
    label: 'Default Email',
    color: '#374151',
    bg: '#f9fafb',
    border: '#e5e7eb',
    icon: () => <Mail className="w-5 h-5 text-gray-600" />,
    build: ({ subject, body, to }) =>
      `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  },
]

/* ── Main Modal ─────────────────────────────────────────── */
export default function ShareModal({ page, notebook, section, onClose }) {
  const [to, setTo]           = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied]   = useState(false)
  const [activeTab, setActiveTab] = useState('email')

  const pageTitle    = page?.title     || 'Untitled Page'
  const nbTitle      = notebook?.title || 'MFNotebook'
  const sectionTitle = section?.title  || ''

  const noteText = htmlToPlainText(page?.content || '')

  const emailSubject = `${pageTitle} — ${nbTitle}`
  const emailBody = [
    message ? `${message}\n\n` : '',
    `📓 ${nbTitle}${sectionTitle ? ` › ${sectionTitle}` : ''}`,
    `📄 ${pageTitle}`,
    '',
    '─'.repeat(40),
    '',
    noteText || '(No content)',
    '',
    '─'.repeat(40),
    'Shared via MFNotebook · Field Documentation Platform',
  ].join('\n')

  const copyText = [
    pageTitle,
    `${nbTitle}${sectionTitle ? ` › ${sectionTitle}` : ''}`,
    '',
    noteText || '(No content)',
  ].join('\n')

  const handleShareTarget = (target) => {
    const url = target.build({ subject: emailSubject, body: emailBody, to })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: pageTitle, text: copyText }) } catch {}
    }
  }

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
    } catch {
      const el = document.createElement('textarea')
      el.value = copyText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-600/30">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Share Note</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{pageTitle}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 pt-3">
          {[
            { id: 'email', label: 'Send via Email', icon: Mail },
            { id: 'text',  label: 'Copy Text',      icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 mr-2 transition-all ${
                activeTab === id
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {activeTab === 'email' && (
            <>
              {/* Page info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{pageTitle}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {nbTitle}{sectionTitle ? ` › ${sectionTitle}` : ''}
                  </p>
                </div>
              </div>

              {/* Note preview */}
              {noteText && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5">Note preview</p>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">{noteText}</p>
                </div>
              )}

              {/* To */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Recipient Email <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Message <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Add a personal note…"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none resize-none transition-all"
                />
              </div>

              {/* Email clients */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Open with</p>
                <div className="grid grid-cols-2 gap-2">
                  {SHARE_TARGETS.map(target => {
                    const Icon = target.icon
                    return (
                      <button
                        key={target.id}
                        onClick={() => handleShareTarget(target)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: target.bg, borderColor: target.border, color: target.color }}
                      >
                        <Icon />
                        {target.label}
                        <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors">
                  <Share2 className="w-4 h-4" />
                  Share via Device…
                </button>
              )}
            </>
          )}

          {activeTab === 'text' && (
            <>
              <p className="text-sm text-gray-500 leading-relaxed">
                Copy the note content below and paste it anywhere — chat, document, or email.
              </p>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl max-h-52 overflow-y-auto">
                <p className="text-xs font-bold text-gray-700 mb-0.5">{pageTitle}</p>
                <p className="text-xs text-gray-400 mb-2">{nbTitle}{sectionTitle ? ` › ${sectionTitle}` : ''}</p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {noteText || '(No content in this note)'}
                </pre>
              </div>

              <button onClick={copyNote}
                className={`w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/20'
                }`}>
                {copied
                  ? <><CheckCheck className="w-4 h-4" /> Copied!</>
                  : <><Copy className="w-4 h-4" /> Copy Note Text</>
                }
              </button>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors">
                  <Share2 className="w-4 h-4" />
                  Share via Device…
                </button>
              )}
            </>
          )}
        </div>

        <div className="px-5 pb-4">
          <p className="text-center text-xs text-gray-300">
            Note content is shared as plain text — no account needed to read it
          </p>
        </div>
      </div>
    </div>
  )
}
