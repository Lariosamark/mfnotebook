import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { dbQuery, IS_LOCAL_MODE } from '../lib/neon'

const AuthContext = createContext(null)

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
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [switching, setSwitching] = useState(false) // account-switch loading screen
  const prevUserIdRef             = useRef(null)

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

  useEffect(() => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
      const saved = getLocalSession()
      if (saved) {
        setUser(saved)
        fetchProfile(saved).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user ?? null
        setUser(u)
        prevUserIdRef.current = u?.id ?? null
        fetchProfile(u).finally(() => setLoading(false))
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const newUser = session?.user ?? null
        const prevId  = prevUserIdRef.current

        // Detect account switch on same PC (different user logged in)
        if (prevId && newUser && prevId !== newUser.id) {
          setSwitching(true)
          setUser(newUser)
          prevUserIdRef.current = newUser.id
          await fetchProfile(newUser)
          // Short delay so loading screen is visible then auto-redirect
          setTimeout(() => setSwitching(false), 1200)
        } else {
          setUser(newUser)
          prevUserIdRef.current = newUser?.id ?? null
          fetchProfile(newUser)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email, password) => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
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

  const signUp = async (email, password, fullName) => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
      const { localDB } = await import('../lib/neon')
      const existing = localDB.getUsers().find((u) => u.email === email)
      if (existing) throw new Error('An account with this email already exists.')
      const id = crypto.randomUUID()
      const user = localDB.upsertUser({ auth_id: id, email, full_name: fullName, role: 'employee' })
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

  const signOut = async () => {
    if (IS_LOCAL_MODE || !SUPABASE_OK) {
      setLocalSession(null)
    } else {
      await supabase.auth.signOut()
    }
    prevUserIdRef.current = null
    setUser(null)
    setProfile(null)
  }

  const isAdmin    = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'
  const isLocalMode = IS_LOCAL_MODE || !SUPABASE_OK

  return (
    <AuthContext.Provider value={{
      user, profile, loading, switching,
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
