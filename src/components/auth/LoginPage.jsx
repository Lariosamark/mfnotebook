import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { IS_LOCAL_MODE } from '../../lib/neon'
import {
  BookOpen, Eye, EyeOff, LogIn, AlertCircle,
  ArrowRight, Loader2, Database, CheckCircle2, UserPlus
} from 'lucide-react'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const { showToast } = useApp()

  const [mode, setMode]           = useState('login')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm]           = useState({ email: '', password: '', fullName: '' })
  const [errors, setErrors]       = useState({})
  const [mounted, setMounted]     = useState(false)

  const isLocal = IS_LOCAL_MODE || !import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')

  useEffect(() => {
    // Small delay for entrance animation
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    if (mode === 'signup' && !form.fullName.trim()) e.fullName = 'Full name is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email.trim().toLowerCase(), form.password)
        showToast('Welcome back!')
      } else {
        await signUp(form.email.trim().toLowerCase(), form.password, form.fullName.trim())
        showToast('Account created! Welcome to MFNotebook.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: (v) => { setForm(f => ({ ...f, [key]: v })); if (errors[key]) setErrors(e => ({ ...e, [key]: '' })) },
    error: errors[key],
  })

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-3xl" />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className={`relative w-full max-w-md transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/60 rounded-2xl p-8 shadow-2xl shadow-black/50">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30 flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight">MFNotebook</h1>
              <p className="text-slate-500 text-xs">Field Documentation Platform</p>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {mode === 'login' ? 'Sign in to your account to continue' : 'Get started with MFNotebook today'}
          </p>

          {/* Mode toggle */}
          <div className="flex bg-slate-800/60 border border-slate-700/40 rounded-xl p-1 gap-1 mb-6">
            {[
              { id: 'login',  label: 'Sign In',        icon: LogIn },
              { id: 'signup', label: 'Create Account', icon: UserPlus },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} type="button"
                onClick={() => { setMode(id); setErrors({}); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === id
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {mode === 'signup' && (
              <DarkField label="Full Name" type="text" placeholder="John Smith"
                {...field('fullName')} autoComplete="name" />
            )}

            <DarkField label="Email Address" type="email" placeholder="you@company.com"
              {...field('email')} autoComplete="email" />

            <DarkField label="Password" type={showPass ? 'text' : 'password'}
              placeholder="••••••••" {...field('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              suffix={
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              } />

            <button type="submit" disabled={loading || !form.email || !form.password}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 mt-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 group">
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Connection status */}
          <div className={`mt-5 flex items-start gap-2.5 p-3 rounded-xl text-xs border ${
            isLocal
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-brand-600/10 border-brand-500/20 text-brand-400'
          }`}>
            {isLocal
              ? <><Database className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span><strong>Local Mode</strong> — Data saves in your browser. Session restores automatically.</span></>
              : <><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span><strong>Connected</strong> to Supabase + Neon — Session persists across visits.</span></>
            }
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs mt-4">
          © {new Date().getFullYear()} MFNotebook · Field Documentation Platform
        </p>
      </div>
    </div>
  )
}

/* ─── Dark-themed input field ─────────────────────────────── */
function DarkField({ label, type, placeholder, value, onChange, error, suffix, autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className={`flex items-center bg-slate-800/50 border rounded-xl transition-all focus-within:bg-slate-800 ${
        error
          ? 'border-red-500/50 focus-within:border-red-400'
          : 'border-slate-700/60 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20'
      }`}>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm px-4 py-3 outline-none"
        />
        {suffix && <span className="pr-3">{suffix}</span>}
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  )
}
