import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { IS_LOCAL_MODE } from '../../lib/neon'

/* ─── Inline SVG icons ──────────────────────────────────────── */
const Icon = {
  book:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  eye:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  arrow:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  alert:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  mail:   <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
}

/* ─── Floating bubble canvas (green tones) ──────────────────── */
function BubbleCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const bubbles = Array.from({ length: 24 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * canvas.height,
      r: Math.random() * 16 + 4,
      speed: Math.random() * 0.38 + 0.1,
      drift: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.13 + 0.03,
    }))
    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)
      for (const b of bubbles) {
        b.y -= b.speed; b.x += b.drift
        if (b.y + b.r < 0) { b.y = h + b.r; b.x = Math.random() * w }
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(34,130,65,${b.a * 1.5})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = `rgba(74,222,128,${b.a * 0.3})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

/* ─── Styles ────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');

  .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lp-root {
    min-height: 100dvh;
    display: flex;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #f0fdf4;
    position: relative;
    overflow: hidden;
  }

  /* ─── Left split panel ─── */
  .lp-left {
    display: none;
    position: relative;
    flex: 1;
    background: #0f4c27;
    overflow: hidden;
    flex-direction: column;
    justify-content: flex-end;
    padding: 3rem;
  }
  @media (min-width: 860px) { .lp-left { display: flex; } }

  .lp-left-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 52px 52px;
  }
  .lp-left-glow {
    position: absolute; border-radius: 50%; pointer-events: none;
    width: 500px; height: 500px; top: -100px; left: -100px;
    background: radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 65%);
  }

  .lp-left-content { position: relative; z-index: 1; }

  .lp-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 2.25rem; }
  .lp-pill {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.13);
    border-radius: 20px; padding: 5px 12px;
    font-size: 0.72rem; font-weight: 500;
    color: rgba(255,255,255,0.6); letter-spacing: 0.04em;
  }
  .lp-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; flex-shrink: 0; }

  .lp-left-bar {
    width: 36px; height: 3px; border-radius: 2px;
    background: #4ade80; margin-bottom: 1.4rem;
    animation: growBar 1.1s ease 0.3s both;
  }
  @keyframes growBar { from { width: 0; opacity: 0; } to { width: 36px; opacity: 1; } }

  .lp-left-quote {
    font-family: 'Lora', serif;
    font-size: 1.8rem; font-weight: 400;
    color: #fff; line-height: 1.45;
    margin-bottom: 1.2rem; max-width: 340px;
  }
  .lp-left-quote em { font-style: italic; color: #86efac; }
  .lp-left-caption { font-size: 0.75rem; color: rgba(255,255,255,0.35); letter-spacing: 0.08em; }

  /* ─── Right panel ─── */
  .lp-right {
    flex: 0 0 100%;
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1.5rem;
    background: #f0fdf4;
    position: relative;
  }
  @media (min-width: 860px) { .lp-right { flex: 0 0 460px; padding: 2.5rem; } }

  /* subtle dot pattern on right bg */
  .lp-right::before {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(circle, rgba(22,163,74,0.08) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }

  /* ─── Card ─── */
  .lp-card {
    position: relative; z-index: 1;
    width: 100%; max-width: 400px;
    background: #ffffff;
    border: 1px solid #d1fae5;
    border-radius: 20px;
    padding: 2.25rem 2rem;
    box-shadow: 0 4px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(22,163,74,0.06);
    opacity: 0; transform: translateY(18px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .lp-card.mounted { opacity: 1; transform: translateY(0); }

  /* green top accent line */
  .lp-card::before {
    content: '';
    position: absolute; top: 0; left: 12%; right: 12%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #16a34a, #4ade80, #16a34a, transparent);
    border-radius: 0 0 2px 2px;
  }

  /* ─── Logo ─── */
  .lp-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 2rem; }
  .lp-logo-mark {
    width: 42px; height: 42px; border-radius: 11px;
    background: #16a34a;
    display: flex; align-items: center; justify-content: center;
    color: #fff; flex-shrink: 0;
    box-shadow: 0 3px 12px rgba(22,163,74,0.28);
    position: relative; overflow: hidden;
  }
  .lp-logo-mark::after {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 45%; background: rgba(255,255,255,0.15);
    border-radius: 11px 11px 0 0;
  }
  .lp-logo-name {
    font-family: 'Lora', serif;
    font-size: 1.15rem; font-weight: 500; color: #0a1a0e;
    line-height: 1; margin-bottom: 3px;
  }
  .lp-logo-tag { font-size: 0.67rem; color: #9ca3af; letter-spacing: 0.12em; text-transform: uppercase; }

  /* ─── Heading ─── */
  .lp-heading {
    font-family: 'Lora', serif;
    font-size: 1.65rem; font-weight: 400;
    color: #0a1a0e; line-height: 1.25;
    margin-bottom: 0.3rem; letter-spacing: -0.01em;
  }
  .lp-subheading { font-size: 0.82rem; color: #6b7280; margin-bottom: 1.6rem; }

  /* ─── Ornament separator ─── */
  .lp-orn {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 1.4rem;
  }
  .lp-orn-line { flex: 1; height: 1px; background: #d1fae5; }
  .lp-orn-diamonds { display: flex; gap: 4px; align-items: center; }
  .lp-orn-d { width: 5px; height: 5px; background: #16a34a; transform: rotate(45deg); opacity: 0.35; }
  .lp-orn-d.big { width: 7px; height: 7px; opacity: 0.6; }

  /* ─── Toggle ─── */
  .lp-toggle {
    display: flex; background: #f0fdf4;
    border: 1px solid #d1fae5; border-radius: 10px;
    padding: 3px; gap: 3px; margin-bottom: 1.4rem;
  }
  .lp-tab {
    flex: 1; padding: 9px 0;
    border: none; background: transparent;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase;
    color: #9ca3af; border-radius: 8px;
    cursor: pointer; transition: all 0.22s ease;
  }
  .lp-tab.active { background: #16a34a; color: #fff; box-shadow: 0 2px 8px rgba(22,163,74,0.28); }
  .lp-tab:not(.active):hover { color: #15803d; background: #dcfce7; }

  /* ─── Banners ─── */
  .lp-notice {
    display: flex; align-items: flex-start; gap: 9px;
    padding: 11px 13px; border-radius: 9px;
    font-size: 0.79rem; line-height: 1.55;
    margin-bottom: 1rem; animation: fadeIn 0.25s ease;
  }
  .lp-notice.info  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .lp-notice.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
  .lp-notice.warn  { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
  .lp-notice-icon  { flex-shrink: 0; margin-top: 1px; }

  /* ─── Field ─── */
  .lp-field { margin-bottom: 0.9rem; }
  .lp-label {
    display: block; font-size: 0.69rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #374151; margin-bottom: 6px;
  }
  .lp-input-wrap {
    display: flex; align-items: center;
    background: #fff; border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    transition: border-color 0.18s, box-shadow 0.18s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .lp-input-wrap:focus-within {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
  }
  .lp-input-wrap.err { border-color: #f87171; }
  .lp-input-wrap.err:focus-within { box-shadow: 0 0 0 3px rgba(248,113,113,0.12); }
  .lp-input {
    flex: 1; background: transparent; border: none; outline: none;
    color: #111827; font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.875rem; padding: 12px 15px;
  }
  .lp-input::placeholder { color: #d1d5db; }
  .lp-input-sfx { padding-right: 10px; }
  .lp-eye {
    background: transparent; border: none; cursor: pointer;
    padding: 6px; border-radius: 6px; color: #9ca3af;
    display: flex; align-items: center;
    transition: color 0.15s, background 0.15s;
  }
  .lp-eye:hover { color: #16a34a; background: #f0fdf4; }
  .lp-field-err {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.72rem; color: #dc2626; margin-top: 5px;
  }

  /* ─── Button ─── */
  .lp-btn {
    width: 100%; display: flex; align-items: center; justify-content: center;
    gap: 9px; margin-top: 1rem; padding: 13px 20px;
    border: none; border-radius: 11px;
    background: #16a34a; color: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.84rem; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    cursor: pointer; position: relative; overflow: hidden;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 3px 16px rgba(22,163,74,0.25);
  }
  .lp-btn:hover:not(:disabled) {
    background: #15803d; transform: translateY(-1px);
    box-shadow: 0 6px 22px rgba(22,163,74,0.35);
  }
  .lp-btn:active:not(:disabled) { transform: translateY(0); }
  .lp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .lp-btn::after {
    content: ''; position: absolute; top: 0; left: -80%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
    transition: left 0.55s ease;
  }
  .lp-btn:hover:not(:disabled)::after { left: 145%; }
  .lp-btn-arr { margin-left: auto; transition: transform 0.2s; }
  .lp-btn:hover:not(:disabled) .lp-btn-arr { transform: translateX(3px); }

  /* spinner */
  .lp-spin {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }

  /* ─── Verification ─── */
  .lp-verify { animation: fadeIn 0.3s ease; }
  .lp-verify-icon {
    width: 64px; height: 64px; border-radius: 16px;
    background: #f0fdf4; border: 1px solid #bbf7d0;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.2rem; color: #16a34a;
  }
  .lp-verify-title {
    font-family: 'Lora', serif; font-size: 1.5rem; font-weight: 400;
    text-align: center; color: #0a1a0e; margin-bottom: 0.35rem;
  }
  .lp-verify-desc { text-align: center; font-size: 0.8rem; color: #6b7280; margin-bottom: 1.4rem; line-height: 1.6; }
  .lp-verify-email { color: #16a34a; font-weight: 600; }
  .lp-divider { width: 24px; height: 2px; background: #bbf7d0; border-radius: 2px; margin: 0 auto 1.2rem; }
  .lp-step {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 13px; border-radius: 9px;
    background: #f9fafb; border: 1px solid #f3f4f6;
    margin-bottom: 7px; font-size: 0.8rem; color: #374151;
  }
  .lp-step-num {
    width: 22px; height: 22px; border-radius: 50%;
    background: #16a34a; color: #fff;
    font-size: 0.7rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  /* ─── Footer ─── */
  .lp-footer {
    text-align: center; font-size: 0.7rem;
    color: #9ca3af; margin-top: 1.5rem; letter-spacing: 0.05em;
  }

  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`

/* ─── Main export ───────────────────────────────────────────── */
export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const { showToast }      = useApp()

  const [mode, setMode]         = useState('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ email: '', password: '', fullName: '' })
  const [errors, setErrors]     = useState({})
  const [mounted, setMounted]   = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  const isLocal = IS_LOCAL_MODE || !import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    if (mode === 'signup' && !form.fullName.trim()) e.fullName = 'Full name is required'
    setErrors(e); return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email.trim().toLowerCase(), form.password)
        showToast('Welcome back.')
      } else {
        await signUp(form.email.trim().toLowerCase(), form.password, form.fullName.trim())
        if (!isLocal) setVerificationSent(true)
        else showToast('Account created. Welcome to MFNotebook.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  const field = (key) => ({
    value: form[key],
    onChange: (v) => { setForm(f => ({ ...f, [key]: v })); if (errors[key]) setErrors(e => ({ ...e, [key]: '' })) },
    error: errors[key],
  })

  return (
    <>
      <style>{STYLES}</style>
      <div className="lp-root">

        {/* Left panel */}
        <div className="lp-left">
          <BubbleCanvas />
          <div className="lp-left-grid" />
          <div className="lp-left-glow" />
          <div className="lp-left-content">
            <div className="lp-pills">
              {['Field Ready', 'Offline Capable', 'Real-time Sync'].map(p => (
                <span key={p} className="lp-pill"><span className="lp-pill-dot" />{p}</span>
              ))}
            </div>
            <div className="lp-left-bar" />
            <p className="lp-left-quote">
              Document everything,<br />
              <em>miss nothing</em> in the field.
            </p>
            <p className="lp-left-caption">MFNotebook · Field Documentation Platform</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="lp-right">
          <div className={`lp-card ${mounted ? 'mounted' : ''}`}>

            {/* Logo */}
            <div className="lp-logo">
              <div className="lp-logo-mark">{Icon.book}</div>
              <div>
                <div className="lp-logo-name">MFNotebook</div>
                <div className="lp-logo-tag">Field Documentation</div>
              </div>
            </div>

            {/* Verification screen */}
            {verificationSent ? (
              <div className="lp-verify">
                <div className="lp-verify-icon">{Icon.mail}</div>
                <h2 className="lp-verify-title">Check your inbox</h2>
                <p className="lp-verify-desc">
                  A verification link was sent to{' '}
                  <span className="lp-verify-email">{form.email}</span>
                </p>
                <div className="lp-divider" />
                {['Open your email inbox', 'Find the email from MFNotebook', 'Click the confirmation link', 'Return here and sign in'].map((text, i) => (
                  <div key={i} className="lp-step">
                    <span className="lp-step-num">{i + 1}</span>{text}
                  </div>
                ))}
                <div className="lp-notice warn" style={{ marginTop: '1rem' }}>
                  <span className="lp-notice-icon">{Icon.alert}</span>
                  <span>Check your <strong>spam folder</strong> if the email doesn't arrive within a minute.</span>
                </div>
                <button className="lp-btn" style={{ marginTop: '1.25rem' }}
                  onClick={() => { setVerificationSent(false); setMode('login'); setError('') }}>
                  Continue to Sign In
                  <span className="lp-btn-arr">{Icon.arrow}</span>
                </button>
              </div>

            ) : (
              <>
                <h1 className="lp-heading">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p className="lp-subheading">
                  {mode === 'login' ? 'Sign in to your workspace to continue' : 'Get started with MFNotebook today'}
                </p>

                {/* Ornament */}
                <div className="lp-orn">
                  <div className="lp-orn-line" />
                  <div className="lp-orn-diamonds">
                    <div className="lp-orn-d" />
                    <div className="lp-orn-d big" />
                    <div className="lp-orn-d" />
                  </div>
                  <div className="lp-orn-line" />
                </div>

                {/* Tab toggle */}
                <div className="lp-toggle" role="tablist">
                  {[{ id: 'login', label: 'Sign In' }, { id: 'signup', label: 'Register' }].map(({ id, label }) => (
                    <button key={id} type="button" role="tab" aria-selected={mode === id}
                      className={`lp-tab ${mode === id ? 'active' : ''}`}
                      onClick={() => { setMode(id); setErrors({}); setError('') }}>
                      {label}
                    </button>
                  ))}
                </div>

                {mode === 'signup' && !isLocal && (
                  <div className="lp-notice info">
                    <span className="lp-notice-icon">{Icon.mail}</span>
                    <span>After registering you'll receive a <strong>verification email</strong>. Confirm it before signing in.</span>
                  </div>
                )}

                {error && (
                  <div className="lp-notice error">
                    <span className="lp-notice-icon">{Icon.alert}</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  {mode === 'signup' && (
                    <Field label="Full Name" type="text" placeholder="Jane Smith"
                      autoComplete="name" {...field('fullName')} />
                  )}
                  <Field label="Email Address" type="email" placeholder="you@company.com"
                    autoComplete="email" {...field('email')} />
                  <Field label="Password" type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    {...field('password')}
                    suffix={
                      <button type="button" className="lp-eye" onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Hide password' : 'Show password'}>
                        {showPass ? Icon.eyeOff : Icon.eye}
                      </button>
                    }
                  />
                  <button type="submit" className="lp-btn"
                    disabled={loading || !form.email || !form.password}>
                    {loading
                      ? <><div className="lp-spin" />{mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                      : <>{mode === 'login' ? 'Sign In' : 'Create Account'}<span className="lp-btn-arr">{Icon.arrow}</span></>
                    }
                  </button>
                </form>
              </>
            )}

            <p className="lp-footer">© {new Date().getFullYear()} MFNotebook · All rights reserved</p>
          </div>
        </div>

      </div>
    </>
  )
}

/* ─── Field component ───────────────────────────────────────── */
function Field({ label, type, placeholder, value, onChange, error, suffix, autoComplete }) {
  return (
    <div className="lp-field">
      <label className="lp-label">{label}</label>
      <div className={`lp-input-wrap ${error ? 'err' : ''}`}>
        <input type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete} className="lp-input" />
        {suffix && <span className="lp-input-sfx">{suffix}</span>}
      </div>
      {error && (
        <p className="lp-field-err">
          <span style={{ flexShrink: 0 }}>{Icon.alert}</span>{error}
        </p>
      )}
    </div>
  )
}