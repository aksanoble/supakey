import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext({})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting initial session:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth event:', _event, session?.user?.email)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithProvider = async ({ provider, redirectTo, scopes }) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes
        }
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      // Do not set loading false immediately; OAuth will redirect away.
      setLoading(false)
    }
  }

  const linkProvider = async ({ provider, redirectTo, scopes }) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo,
          scopes
        }
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signInWithProvider,
    linkProvider
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
