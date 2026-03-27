import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { dbQuery, IS_LOCAL_MODE } from '../lib/neon'

const AuthContext = createContext(null)

// ─── LocalStorage auth (demo mode, no Supabase needed) ───────────────────────
const LS_AUTH = 'mfnotebook_auth'

function getLocalSession() {
  try { return JSON.parse(localStorage.getItem(LS_AUTH)) } catch { return null }
}
function setLocalSession(user) {
  if (user) localStorage.setItem(LS_AUTH, JSON.stringify(user))
  else localStorage.removeItem(LS_AUTH)
}

const SUPABASE_OK =
  import.meta.env.VITE_SUPABASE_URL &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

// ─────────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── fetch / upsert profile in DB ────────────────────────────────────────
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) { setProfile(null); return }
    try {
      const rows = await dbQuery(
        'SELECT * FROM mf_users WHERE auth_id = $1 LIMIT 1',
        [authUser.id]
      )
      if (rows.length > 0) {
        setProfile(rows[0])
      } else {
        const newRows = await dbQuery(
          `INSERT INTO mf_users (auth_id, email, full_name, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (auth_id) DO UPDATE SET email = EXCLUDED.email
           RETURNING *`,
          [
            authUser.id,
            authUser.email,
            authUser.user_metadata?.full_name || authUser.full_name || authUser.email.split('@')[0],
            'employee',
          ]
        )
        setProfile(newRows[0])
      }
    } catch (err) {
      console.error('Failed to fetch/create profile:', err)
    }
  }, [])

  // ── boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
      // Local / demo mode: instantly restore from localStorage
      const saved = getLocalSession()
      if (saved) {
        setUser(saved)
        fetchProfile(saved).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    } else {
      // Supabase mode: SDK restores from its own localStorage cache automatically
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Session restore failed, clearing session:', error.message)
          supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        setUser(session?.user ?? null)
        fetchProfile(session?.user ?? null).finally(() => setLoading(false))
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
          fetchProfile(session?.user ?? null)
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setUser(null)
          setProfile(null)
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setUser(session?.user ?? null)
          fetchProfile(session?.user ?? null)
        } else if (!session) {
          // Covers invalid/expired refresh token — force clean logout
          setUser(null)
          setProfile(null)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ── sign in ─────────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
      // Local mode: look up user by email, verify password stored in meta
      const { localDB } = await import('../lib/neon')
      const users = localDB.getUsers()
      const found = users.find((u) => u.email === email)
      if (!found) throw new Error('No account found with that email.')
      if (found._password && found._password !== password) throw new Error('Incorrect password.')
      const authUser = { id: found.id, email: found.email, full_name: found.full_name, user_metadata: { full_name: found.full_name } }
      setLocalSession(authUser)
      setUser(authUser)
      await fetchProfile(authUser)
      return authUser
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // ── sign up ─────────────────────────────────────────────────────────────
  const signUp = async (email, password, fullName) => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
      // Local mode: create user directly in localDB
      const { localDB } = await import('../lib/neon')
      const existing = localDB.getUsers().find((u) => u.email === email)
      if (existing) throw new Error('An account with this email already exists.')
      const { v4: uuidv4 } = await import('crypto').catch(() => ({ v4: () => crypto.randomUUID() }))
      const id = crypto.randomUUID()
      const user = localDB.upsertUser({ auth_id: id, email, full_name: fullName, role: 'employee' })
      // Store password in local record (demo only — never do this in production)
      const { localDB: ldb } = await import('../lib/neon')
      ldb.updateUser(user.id, { _password: password, full_name: fullName })
      const authUser = { id: user.id, email, full_name: fullName, user_metadata: { full_name: fullName } }
      setLocalSession(authUser)
      setUser(authUser)
      await fetchProfile(authUser)
      return authUser
    }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  }

  // ── sign out ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
      setLocalSession(null)
    } else {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
  }

  const isAdmin    = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'
  const isLocalMode = IS_LOCAL_MODE || !SUPABASE_OK

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signOut,
      isAdmin, isEmployee, isLocalMode,
      fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}