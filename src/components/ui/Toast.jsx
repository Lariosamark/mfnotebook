import { useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X, AlertTriangle } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'

export default function Toast() {
  const { toast } = useApp()
  if (!toast) return null

  const config = {
    success: { icon: <CheckCircle2 className="w-4 h-4" />, cls: 'bg-brand-600 text-white border-brand-400/30' },
    error:   { icon: <XCircle className="w-4 h-4" />,      cls: 'bg-red-500 text-white border-red-400/30' },
    warning: { icon: <AlertCircle className="w-4 h-4" />,  cls: 'bg-amber-500 text-white border-amber-400/30' },
  }
  const { icon, cls } = config[toast.type] || config.success

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lifted border ${cls} min-w-[220px] max-w-xs`}>
        {icon}
        <span className="text-sm font-medium flex-1">{toast.message}</span>
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-gray-50 rounded-2xl shadow-lifted border border-gray-200 animate-scale-in overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose}
              className="text-gray-9000 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4 ${
          danger ? 'bg-red-500/15' : 'bg-brand-600/15'
        }`}>
          <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-brand-400'}`} />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-ink-600 text-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-400' : 'bg-brand-600 hover:bg-brand-700'
            }`}>
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`bg-gray-50 rounded-lg animate-pulse ${className}`} />
}
