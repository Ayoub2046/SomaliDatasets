import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { auth, IS_LIVE } from '../services/dataService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Merge the DB profile (role, status, counters) into the auth user
  // so components can rely on user.role everywhere.
  const enrich = useCallback(async (u) => {
    if (!u || !IS_LIVE) return u
    try {
      const p = await auth.getProfile(u.id)
      return p ? { ...u, ...p } : u
    } catch (_) {
      return u
    }
  }, [])

  const apply = useCallback(async (u) => {
    const merged = await enrich(u)
    setUser(merged)
    setLoading(false)
    return merged
  }, [enrich])

  useEffect(() => {
    let unsub = () => {}
    setLoading(true)
    if (IS_LIVE) {
      unsub = auth.onAuthChange((u) => apply(u))
      auth.getUser().then((u) => apply(u))
    } else {
      auth.getUser().then((u) => apply(u))
    }
    return unsub
  }, [apply])

  const refresh = useCallback(async () => {
    const u = await auth.getUser()
    return apply(u)
  }, [apply])

  const login = useCallback(async (payload) => {
    const u = await auth.signIn(payload)
    setUser(u)
    await refresh()
    return u
  }, [refresh])

  const register = useCallback(async (payload) => {
    const u = await auth.signUp(payload)
    setUser(u)
    await refresh()
    return u
  }, [refresh])

  const social = useCallback(async (provider) => {
    const u = await auth.signInSocial(provider)
    setUser(u)
    await refresh()
    return u
  }, [refresh])

  const logout = useCallback(async () => {
    await auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, social, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}