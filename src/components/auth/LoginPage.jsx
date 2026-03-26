import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { IS_LOCAL_MODE } from '../../lib/neon'
import { BookOpen, Eye, EyeOff, ArrowRight, Loader2, Database, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const { showToast } = useApp()
  const [mode, setMode] = useState('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [errors, setErrors] = useState({})

  const isLocal = IS_LOCAL_MODE || !import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Required'
    else if (form.password.length < 6) e.password = 'Min 6 characters'
    if (mode === 'signup' && !form.fullName) e.fullName = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
        showToast('Welcome back!')
      } else {
        await signUp(form.email, form.password, form.fullName)
        showToast('Account created!')
      }
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-brand-600/5 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-lg mb-4 relative">
            <BookOpen className="w-7 h-7 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-brand-400/20" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900 tracking-tight">MFNotebook</h1>
          <p className="text-gray-500 text-sm mt-1">Field Documentation Platform</p>
        </div>

        {/* Card */}
        <div className="bg-gray-100/80 backdrop-blur-sm rounded-2xl border border-gray-300/60 overflow-hidden shadow-lifted">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-300/60 p-1 gap-1 m-1 bg-white/50 rounded-xl">
            {['login', 'signup'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErrors({}) }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === m
                    ? 'bg-ink-700 text-gray-900 shadow-soft'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <Field label="Full Name" type="text" placeholder="John Smith"
                  value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} error={errors.fullName} />
              )}
              <Field label="Email" type="email" placeholder="you@company.com"
                value={form.email} onChange={(v) => setForm({ ...form, email: v })} error={errors.email} />
              <Field label="Password" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors.password}
                suffix={
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="text-gray-9000 hover:text-gray-600 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all mt-2 group">
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                }
              </button>
            </form>

            <div className={`mt-4 flex items-start gap-2.5 p-3 rounded-xl text-xs ${
              isLocal
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : 'bg-brand-600/10 border border-brand-500/20 text-brand-400'
            }`}>
              {isLocal
                ? <><Database className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span><strong>Local Mode</strong> — Data saves in your browser.</span></>
                : <><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span><strong>Connected</strong> to Supabase + Neon</span></>
              }
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} MFNotebook · Field Documentation Platform
        </p>
      </div>
    </div>
  )
}

function Field({ label, type, placeholder, value, onChange, error, suffix }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className={`flex items-center bg-white/70 border rounded-xl transition-all focus-within:bg-white ${
        error ? 'border-red-500/50 focus-within:border-red-400' : 'border-gray-300 focus-within:border-brand-500 focus-within:shadow-glow'
      }`}>
        <input type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 text-sm px-3.5 py-3 outline-none" />
        {suffix && <span className="pr-3.5">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
